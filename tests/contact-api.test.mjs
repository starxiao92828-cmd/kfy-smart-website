import assert from 'node:assert/strict';
import handler from '../api/contact.js';

// Preview redeploy trigger: runtime behavior is unchanged.
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

process.env.RESEND_API_KEY = '  re_test_resend_key  ';
process.env.CONTACT_FORM_FROM = 'KFY SMART <website@kfysmart.com>';
process.env.CONTACT_FORM_TO = 'liwei@kfygroup.com';
process.env.CONTACT_FORM_CC = 'yinquan@kfygroup.com';
process.env.TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
process.env.VERCEL_ENV = 'preview';

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runRequest({ method = 'POST', body = {}, headers = {} } = {}) {
  const req = { method, body, headers };
  const res = createResponse();
  await handler(req, res);
  return res;
}

const validBody = {
  name: 'KFY SMART Preview Test',
  businessEmail: 'preview.contact.test@gmail.com',
  companyName: 'PREVIEW TEST – DO NOT FOLLOW UP',
  country: 'United States',
  productInterest: 'Adjustable Bed Bases',
  specificProduct: 'E1',
  estimatedQuantity: 'Test quantity',
  phone: '+1 555 0100',
  message: 'This is a KFY SMART Contact Form Preview test. Do not follow up as a customer inquiry.',
  privacyAgreement: true,
  website: '',
  turnstileToken: 'test-token',
  sourcePage: '/contact/',
  pageUrl: 'https://preview.example/contact/?utm_source=codex',
  productModel: 'E1',
  referrer: 'https://preview.example/products/',
  utmSource: 'codex',
  utmMedium: 'preview',
  utmCampaign: 'contact-form-v1',
};

try {
  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('Invalid country must not call an external service');
    };
    const res = await runRequest({ body: { ...validBody, country: 'Not a canonical country' } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.errors.country, 'Select a valid country or region from the list.');
    assert.equal(calls, 0);
  }

  {
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'invalid-key';
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('Malformed Resend key must not call an external service');
    };
    const res = await runRequest({ body: validBody });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'We could not submit your inquiry. Please check the form and try again, or contact us directly by email.');
    assert.equal(calls, 0);
    process.env.RESEND_API_KEY = originalKey;
  }

  {
    globalThis.fetch = async () => {
      throw new Error('GET must not call an external service');
    };
    const res = await runRequest({ method: 'GET' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY });
    assert.equal(Object.keys(res.body).length, 1);
  }

  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('Missing Turnstile token must not call an external service');
    };
    const res = await runRequest({ body: { ...validBody, turnstileToken: '' } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'turnstile');
    assert.equal(calls, 0);
  }

  {
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return { success: false, action: 'contact_form', hostname: 'preview.example' };
        },
      };
    };
    const res = await runRequest({ body: validBody });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'turnstile');
    assert.deepEqual(calls, ['https://challenges.cloudflare.com/turnstile/v0/siteverify']);
  }

  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('Honeypot must not call an external service');
    };
    const res = await runRequest({ body: { ...validBody, website: 'https://spam.example' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(calls, 0);
  }

  {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.includes('siteverify')) {
        return {
          ok: true,
          async json() {
            return { success: true, action: 'contact_form', hostname: 'preview.example' };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return { id: 'resend-test-id' };
        },
      };
    };
    const res = await runRequest({ body: validBody, headers: { 'x-forwarded-for': '203.0.113.10' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(calls[1].url, 'https://api.resend.com/emails');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer re_test_resend_key');
    assert.equal(calls[1].options.headers['User-Agent'], 'KFY-SMART-Contact-Form/1.0');

    const payload = JSON.parse(calls[1].options.body);
    assert.deepEqual(payload.to, ['liwei@kfygroup.com']);
    assert.deepEqual(payload.cc, ['yinquan@kfygroup.com']);
    assert.equal(payload.reply_to, validBody.businessEmail);
    assert.equal(payload.from, process.env.CONTACT_FORM_FROM);
    assert.equal(payload.subject, '[PREVIEW TEST] New Website Inquiry – PREVIEW TEST – DO NOT FOLLOW UP – Adjustable Bed Bases');
    assert.match(payload.html, /Inquiry Details/);
    assert.match(payload.html, /Source Information/);
    assert.match(payload.text, /UTM Campaign: contact-form-v1/);
    assert.equal(calls[1].options.headers['Idempotency-Key'], res.body.submissionId);
    assert.doesNotMatch(payload.html, /test-token|re_test_resend_key/);
    assert.doesNotMatch(payload.text, /test-token|re_test_resend_key/);
  }

  {
    process.env.VERCEL_ENV = 'production';
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return {
        ok: true,
        async json() {
          return { success: true, action: 'wrong_action', hostname: 'preview.example' };
        },
      };
    };
    const res = await runRequest({ body: validBody });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'turnstile');
    assert.equal(calls, 1);
  }

  console.log('contact-api targeted tests: passed');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}
