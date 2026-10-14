import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/js/inquiry-context.js', import.meta.url), 'utf8');
const origin = 'https://www.kfysmart.com';
const storageKey = 'kfy_inquiry_context_v1';
const storage = new Map();
const preference = { value: 'accepted' };

function visit(path, { referrer = '', links = [], blockedStorage = false } = {}) {
  const location = new URL(path, origin);
  const events = {};
  const anchors = links.map((href) => ({
    href,
    getAttribute() { return this.href; },
    setAttribute(_name, value) { this.href = value; },
  }));
  const window = {
    location,
    localStorage: { getItem: () => preference.value },
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw Error('Blocked'); return storage.get(key); },
      setItem(key, value) { if (blockedStorage) throw Error('Blocked'); storage.set(key, value); },
      removeItem(key) { if (blockedStorage) throw Error('Blocked'); storage.delete(key); },
    },
  };
  const document = {
    cookie: '', referrer,
    querySelectorAll: () => anchors,
    addEventListener(name, fn) { events[name] = fn; },
  };
  vm.runInNewContext(script, { window, document, URL, URLSearchParams });
  return { context: window.KFY_INQUIRY_CONTEXT, anchors, events };
}

// An external campaign survives article -> product -> contact navigation.
visit('/news/smart-mattress-oem-odm-sourcing-china-b2b-guide/?utm_source=linkedin&utm_medium=social&utm_campaign=buyer_guides&utm_content=post_a', { referrer: 'https://www.linkedin.com/feed/?private=value' });
const product = visit('/products/smart-mattresses/w3-premium-11-inch-smart-mattress/', {
  referrer: `${origin}/news/smart-mattress-oem-odm-sourcing-china-b2b-guide/`,
  links: ['/contact/?model=W3', '/products/', 'https://other.example/contact/'],
});
const quoteUrl = new URL(product.anchors[0].href, origin);
assert.equal(quoteUrl.searchParams.get('model'), 'W3');
assert.equal(quoteUrl.searchParams.get('category'), 'smart-mattresses');
assert.equal(quoteUrl.searchParams.get('source'), '/products/smart-mattresses/w3-premium-11-inch-smart-mattress/');
assert.equal(quoteUrl.searchParams.has('utm_source'), false);
assert.equal(product.anchors[1].href, '/products/');
assert.equal(product.anchors[2].href, 'https://other.example/contact/');
const contact = visit(product.anchors[0].href).context.get();
assert.equal(contact.utmSource, 'linkedin');
assert.equal(contact.utmContent, 'post_a');
assert.equal(contact.sourcePage, quoteUrl.searchParams.get('source'));
assert.equal(contact.landingPage, '/news/smart-mattress-oem-odm-sourcing-china-b2b-guide/');
assert.equal(contact.referrer, 'https://www.linkedin.com/feed/');

// A new campaign does not borrow missing fields from an old one.
visit('/?utm_source=facebook&utm_medium=social');
const next = visit('/contact/').context.get();
assert.equal(next.utmSource, 'facebook');
assert.equal(next.utmCampaign, '');
assert.equal(next.utmContent, '');

// Expired context is not attributed to a later direct session.
storage.set(storageKey, JSON.stringify({ utmSource: 'old', lastSeen: Date.now() - 31 * 60 * 1000 }));
assert.equal(visit('/contact/').context.get().utmSource, '');

// Refused consent does not persist campaign history; existing context is cleared.
preference.value = 'rejected';
visit('/?utm_source=linkedin');
assert.equal(storage.has(storageKey), false);
assert.equal(visit('/contact/').context.get().utmSource, '');

// Accepting later captures the current entry; revoking consent clears it.
preference.value = null;
const deferred = visit('/news/?utm_source=linkedin');
assert.equal(storage.has(storageKey), false);
preference.value = 'accepted';
deferred.events.click({ target: { closest: (selector) => selector === '[data-consent-accept]' } });
assert.equal(visit('/contact/').context.get().utmSource, 'linkedin');
preference.value = 'rejected';
deferred.events.click({ target: { closest: (selector) => selector === '[data-consent-reject]' } });
assert.equal(storage.has(storageKey), false);

// Unavailable storage must never block contact links or inquiries.
preference.value = 'accepted';
const blocked = visit('/products/smart-mattresses/', { blockedStorage: true, links: ['/contact/'] });
assert.match(blocked.anchors[0].href, /category=smart-mattresses/);
assert.equal(blocked.context.get().utmSource, '');

// Source paths cannot become external destinations or retain query strings.
storage.clear();
assert.equal(visit('/contact/?source=%2F%2Fevil.example%2F', { referrer: `${origin}/products/?private=value` }).context.get().sourcePage, '/products/');
assert.equal(visit('/contact/?source=%2Fnews%2F%3Fprivate%3Dvalue').context.get().sourcePage, '/news/');

console.log('inquiry context journey, consent, expiry and storage-failure tests: passed');
