import assert from 'node:assert/strict';

function createField(value = '', options = {}) {
  const attributes = new Set();
  const listeners = {};
  return {
    listeners,
    value,
    checked: Boolean(options.checked),
    type: options.type || 'text',
    tagName: options.tagName || 'INPUT',
    validity: { valid: options.valid !== false },
    addEventListener(name, callback) { listeners[name] = callback; },
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); },
    hasAttribute(name) { return attributes.has(name); },
    focus() {},
  };
}

async function runScenario(name, postResponse, inquiryContext, options = {}) {
  const fields = {
    name: createField('Preview Test User'),
    businessEmail: createField('preview@example.com'),
    companyName: createField('Preview Test Company'),
    country: createField('United States'),
    productInterest: createField('Adjustable Bed Bases', { tagName: 'SELECT' }),
    specificProduct: createField('E3'),
    estimatedQuantity: createField('10'),
    phone: createField('+1 555 0100'),
    message: createField('This is a safe mocked contact form test.'),
    privacyAgreement: createField('', { type: 'checkbox', checked: true }),
  };
  const submitButton = { disabled: false, textContent: 'Send Inquiry' };
  for (const [key, value] of Object.entries(options.values || {})) fields[key].value = value;
  const guidance = { textContent: '', hidden: true };
  const messageHelp = { textContent: 'Default message help' };
  const status = { textContent: '', className: 'form-status', focus() {} };
  const turnstileFrame = { focus() {} };
  const errors = Object.fromEntries(Object.keys(fields).map((fieldName) => [fieldName, { textContent: '' }]));
  let submitHandler;
  let resetCount = 0;
  const form = {
    elements: { ...fields, website: createField('') },
    querySelector(selector) {
      if (selector === '[data-inquiry-guidance]') return guidance;
      if (selector === '[data-inquiry-message-help]') return messageHelp;
      if (selector === 'button[type="submit"]') return submitButton;
      if (selector === '[data-form-status]') return status;
      if (selector === '[data-turnstile]') return turnstileFrame;
      if (selector.startsWith('#') && selector.endsWith('-error')) return errors[selector.slice(1, -6)];
      return null;
    },
    addEventListener(eventName, handler) {
      if (eventName === 'submit') submitHandler = handler;
    },
    reset() { resetCount += 1; },
  };
  const datalist = { replaceChildren() {} };
  const dataLayer = [];
  let fetchCount = 0;
  let sentPayload;

  globalThis.window = {
    dataLayer,
    KFY_INQUIRY_CONTEXT: inquiryContext ? { get: () => inquiryContext } : undefined,
    localStorage: { getItem: () => 'accepted' },
    location: {
      pathname: '/contact/',
      href: `https://www.kfysmart.com/contact/${options.search || ''}`,
      search: options.search || '',
    },
    turnstile: {
      render(_frame, options) {
        options.callback('mock-turnstile-token');
        return 1;
      },
      reset() {},
    },
  };
  globalThis.document = {
    cookie: 'kfy_analytics_consent=accepted',
    documentElement: { lang: 'en' },
    referrer: '',
    head: { append() {} },
    querySelector(selector) {
      if (selector === '[data-contact-form]') return form;
      if (selector === '#country-options') return datalist;
      return null;
    },
    createElement() { return { value: '' }; },
  };
  globalThis.fetch = async (_url, options = {}) => {
    fetchCount += 1;
    if (!options.method) {
      return { ok: true, async json() { return { turnstileSiteKey: 'test-site-key' }; } };
    }
    sentPayload = JSON.parse(options.body);
    if (postResponse instanceof Error) throw postResponse;
    return postResponse;
  };

  await import(`../assets/js/contact-form.js?scenario=${encodeURIComponent(name)}`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(typeof submitHandler, 'function');
  if (options.inspectOnly) return { fields, guidance, messageHelp, dataLayer };
  await submitHandler({ preventDefault() {} });

  const leadEvents = dataLayer.filter((entry) => entry.event === 'kfy_generate_lead');
  return { leadEvents, resetCount, status, fetchCount, sentPayload };
}

const success = await runScenario('success', {
  ok: true,
  async json() { return { ok: true, submissionId: ' submission-123 ', message: 'Success' }; },
});
assert.equal(success.leadEvents.length, 1);
assert.deepEqual(Object.keys(success.leadEvents[0]).sort(), [
  'event',
  'language',
  'page_path',
  'product_category',
  'product_model',
]);
assert.equal(success.resetCount, 1);

const attributed = await runScenario('attributed-success', {
  ok: true,
  async json() { return { ok: true, submissionId: 'attributed-123' }; },
}, {
  sourcePage: '/products/smart-mattresses/',
  landingPage: '/news/smart-mattress-oem-odm-sourcing-china-b2b-guide/',
  referrer: 'https://www.linkedin.com/feed/',
  utmSource: 'linkedin', utmMedium: 'social', utmCampaign: 'buyer_guides', utmContent: 'post_a', utmTerm: '',
});
assert.equal(attributed.sentPayload.sourcePage, '/products/smart-mattresses/');
assert.equal(attributed.sentPayload.utmContent, 'post_a');
assert.equal(attributed.sentPayload.landingPage, '/news/smart-mattress-oem-odm-sourcing-china-b2b-guide/');
assert.equal(attributed.leadEvents.length, 1);
assert.equal(attributed.leadEvents[0].page_path, '/contact/');
assert.equal('businessEmail' in attributed.leadEvents[0], false);

const honeypot = await runScenario('honeypot', {
  ok: true,
  async json() { return { ok: true, message: 'Success' }; },
});
assert.equal(honeypot.leadEvents.length, 0);
assert.equal(honeypot.resetCount, 1);
assert.match(honeypot.status.className, /success/);

const httpFailure = await runScenario('http-failure', {
  ok: false,
  async json() { return { error: 'Submission failed' }; },
});
assert.equal(httpFailure.leadEvents.length, 0);
assert.equal(httpFailure.resetCount, 0);

const networkFailure = await runScenario('network-failure', new Error('Mock network failure'));
assert.equal(networkFailure.leadEvents.length, 0);
assert.equal(networkFailure.resetCount, 0);

// Guide visitors get relevant prompts without generating a filled-in inquiry or a lead.
for (const [slug, category, title] of [
  ['adjustable-bed-base-bed-frame-compatibility', 'Adjustable Bed Bases', 'Bed-frame compatibility review'],
  ['adjustable-bed-base-manufacturer-china-b2b-guide', 'Adjustable Bed Bases', 'Adjustable bed base sourcing inquiry'],
  ['smart-mattress-oem-odm-sourcing-china-b2b-guide', 'Smart Mattresses', 'Smart mattress OEM/ODM inquiry'],
]) {
  const entry = await runScenario(slug, null, null, {
    inspectOnly: true,
    search: `?source=${encodeURIComponent(`/news/${slug}/`)}`,
    values: { productInterest: '', specificProduct: '', message: '' },
  });
  assert.equal(entry.fields.productInterest.value, category);
  assert.equal(entry.fields.specificProduct.value, '');
  assert.equal(entry.fields.message.value, '');
  assert.equal(entry.guidance.textContent, title);
  assert.equal(entry.guidance.hidden, false);
  assert(entry.fields.message.placeholder.length > 0);
  assert.equal(entry.dataLayer.length, 0);
  entry.fields.message.value = 'My own requirements';
  entry.fields.productInterest.value = 'Hotel / Project Solutions';
  entry.fields.productInterest.listeners.change();
  assert.equal(entry.guidance.hidden, true);
  assert.equal(entry.messageHelp.textContent, 'Default message help');
  assert.equal(entry.fields.message.value, 'My own requirements');
  entry.fields.productInterest.value = category;
  entry.fields.productInterest.listeners.change();
  assert.equal(entry.guidance.hidden, false);
  assert.equal(entry.fields.message.value, 'My own requirements');
}

const preserved = await runScenario('preserve-visitor-input', null, null, {
  inspectOnly: true,
  search: '?model=E3&category=adjustable-bed-bases&source=%2Fnews%2Fadjustable-bed-base-bed-frame-compatibility%2F',
  values: { specificProduct: 'My shortlisted model', message: 'My project requirements' },
});
assert.equal(preserved.fields.specificProduct.value, 'My shortlisted model');
assert.equal(preserved.fields.message.value, 'My project requirements');

for (const source of ['constructor', '//other.example/', '/news/unknown/', '<img src=x onerror=alert(1)>']) {
  const unknown = await runScenario(`untrusted-source-${source}`, null, null, {
    inspectOnly: true, search: `?source=${encodeURIComponent(source)}`,
  });
  assert.equal(unknown.guidance.hidden, true);
  assert.equal(unknown.messageHelp.textContent, 'Default message help');
}

const anotherCategory = await runScenario('preserve-selected-category', null, null, {
  inspectOnly: true,
  search: '?source=%2Fnews%2Fadjustable-bed-base-bed-frame-compatibility%2F',
  values: { productInterest: 'Smart Beds' },
});
assert.equal(anotherCategory.fields.productInterest.value, 'Smart Beds');
assert.equal(anotherCategory.guidance.hidden, true);

console.log('contact-form analytics targeted tests: passed');
