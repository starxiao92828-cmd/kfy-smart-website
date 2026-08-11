import assert from 'node:assert/strict';

function createField(value = '', options = {}) {
  const attributes = new Set();
  return {
    value,
    checked: Boolean(options.checked),
    type: options.type || 'text',
    tagName: options.tagName || 'INPUT',
    validity: { valid: options.valid !== false },
    addEventListener() {},
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); },
    hasAttribute(name) { return attributes.has(name); },
    focus() {},
  };
}

async function runScenario(name, postResponse) {
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
  const status = { textContent: '', className: 'form-status', focus() {} };
  const turnstileFrame = { focus() {} };
  const errors = Object.fromEntries(Object.keys(fields).map((fieldName) => [fieldName, { textContent: '' }]));
  let submitHandler;
  let resetCount = 0;
  const form = {
    elements: { ...fields, website: createField('') },
    querySelector(selector) {
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

  globalThis.window = {
    dataLayer,
    localStorage: { getItem: () => 'accepted' },
    location: {
      pathname: '/contact/',
      href: 'https://www.kfysmart.com/contact/',
      search: '',
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
    if (postResponse instanceof Error) throw postResponse;
    return postResponse;
  };

  await import(`../assets/js/contact-form.js?scenario=${encodeURIComponent(name)}`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(typeof submitHandler, 'function');
  await submitHandler({ preventDefault() {} });

  const leadEvents = dataLayer.filter((entry) => entry.event === 'kfy_generate_lead');
  return { leadEvents, resetCount, status, fetchCount };
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

console.log('contact-form analytics targeted tests: passed');
