import { randomUUID } from 'node:crypto';

const PRODUCT_INTERESTS = new Set([
  'Adjustable Bed Bases',
  'Smart Beds',
  'Smart Mattresses',
  'OEM / ODM & Private Label',
  'Hotel / Project Solutions',
  'Other / Not Sure',
]);
const REGION_CODES = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const FALLBACK_REGIONS = ['Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany', 'India', 'Italy', 'Japan', 'Mexico', 'Netherlands', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'United Arab Emirates', 'United Kingdom', 'United States'];
const COUNTRY_NAMES = (() => {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return new Set(REGION_CODES.map((code) => displayNames.of(code)).filter(Boolean));
  } catch {
    return new Set(FALLBACK_REGIONS);
  }
})();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDITIONAL_CC_RECIPIENT = 'jiangshan1@kfygroup.com';
const MAX_REQUEST_BYTES = 24_000;
const SUCCESS_MESSAGE = 'Thank you for contacting KFY SMART. Your inquiry has been submitted successfully. Our team will review your requirements and respond within one business day.';
const GENERAL_ERROR = 'We could not submit your inquiry. Please check the form and try again, or contact us directly by email.';
const TURNSTILE_ERROR = 'Security verification could not be completed. Please verify again and resubmit the form.';

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function cleanHeader(value, maxLength) {
  return clean(value, maxLength).replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function splitRecipients(value) {
  return String(value ?? '')
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function logStatus(submissionId, status, code) {
  console.info(JSON.stringify({
    scope: 'contact-form',
    submissionId,
    status,
    code,
    time: new Date().toISOString(),
  }));
}

function logResendConfiguration(submissionId, resendKeyPresent, resendKeyPrefixValid, deploymentEnvironment) {
  console.info(JSON.stringify({
    scope: 'contact-form',
    submissionId,
    status: 'configuration_check',
    resendKeyPresent,
    resendKeyPrefixValid,
    deploymentEnvironment,
    time: new Date().toISOString(),
  }));
}

function validate(body) {
  const values = {
    name: clean(body.name, 100),
    businessEmail: clean(body.businessEmail, 254),
    companyName: clean(body.companyName, 150),
    country: clean(body.country, 100),
    productInterest: clean(body.productInterest, 100),
    specificProduct: clean(body.specificProduct, 100),
    estimatedQuantity: clean(body.estimatedQuantity, 100),
    phone: clean(body.phone, 50),
    message: clean(body.message, 2_000),
    sourcePage: clean(body.sourcePage, 300),
    pageUrl: clean(body.pageUrl, 500),
    productModel: clean(body.productModel, 100),
    referrer: clean(body.referrer, 500),
    utmSource: clean(body.utmSource, 150),
    utmMedium: clean(body.utmMedium, 150),
    utmCampaign: clean(body.utmCampaign, 150),
  };

  const errors = {};
  if (values.name.length < 2) errors.name = 'Enter a name between 2 and 100 characters.';
  if (!EMAIL_PATTERN.test(values.businessEmail) || values.businessEmail.length > 254) errors.businessEmail = 'Enter a valid business email address.';
  if (values.companyName.length < 2) errors.companyName = 'Enter a company name between 2 and 150 characters.';
  if (!COUNTRY_NAMES.has(values.country)) errors.country = 'Select a valid country or region from the list.';
  if (!PRODUCT_INTERESTS.has(values.productInterest)) errors.productInterest = 'Select a valid product interest.';
  if (values.message.length < 10) errors.message = 'Enter a message between 10 and 2,000 characters.';
  if (body.privacyAgreement !== true && body.privacyAgreement !== 'true' && body.privacyAgreement !== 'on') {
    errors.privacyAgreement = 'You must acknowledge the Privacy Policy before submitting.';
  }

  return { values, errors };
}

function buildEmail({ values, submissionId, submissionTime, environment }) {
  const details = [
    ['Submission ID', submissionId],
    ['Submission Time', submissionTime],
    ['Deployment Environment', environment],
    ['Name', values.name],
    ['Business Email', values.businessEmail],
    ['Company Name', values.companyName],
    ['Country / Region', values.country],
    ['Phone / WhatsApp', values.phone || '-'],
    ['Product Interest', values.productInterest],
    ['Specific Product or Model', values.specificProduct || '-'],
    ['Estimated Quantity', values.estimatedQuantity || '-'],
    ['Message', values.message],
  ];
  const source = [
    ['Source Page', values.sourcePage || '-'],
    ['Page URL', values.pageUrl || '-'],
    ['Product Model', values.productModel || values.specificProduct || '-'],
    ['Referrer', values.referrer || '-'],
    ['UTM Source', values.utmSource || '-'],
    ['UTM Medium', values.utmMedium || '-'],
    ['UTM Campaign', values.utmCampaign || '-'],
    ['Language', 'en'],
  ];

  const textSection = (heading, rows) => [
    heading,
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');

  const htmlRows = (rows) => rows.map(([label, value]) => {
    const rendered = label === 'Message'
      ? escapeHtml(value).replaceAll('\n', '<br>')
      : escapeHtml(value);
    return `<tr><th align="left" valign="top" style="padding:8px 12px;border-bottom:1px solid #dce5ef;color:#174a82;width:210px">${escapeHtml(label)}</th><td valign="top" style="padding:8px 12px;border-bottom:1px solid #dce5ef">${rendered}</td></tr>`;
  }).join('');

  return {
    text: `${textSection('Inquiry Details', details)}\n\n${textSection('Source Information', source)}`,
    html: `<div style="font-family:Arial,sans-serif;color:#0d1930;line-height:1.55;max-width:760px"><h1 style="font-size:24px;color:#071426">New KFY SMART Website Inquiry</h1><h2 style="font-size:18px;color:#174a82">Inquiry Details</h2><table role="presentation" style="width:100%;border-collapse:collapse">${htmlRows(details)}</table><h2 style="font-size:18px;color:#174a82;margin-top:28px">Source Information</h2><table role="presentation" style="width:100%;border-collapse:collapse">${htmlRows(source)}</table></div>`,
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const siteKey = process.env.TURNSTILE_SITE_KEY;
    if (!siteKey) return sendJson(res, 503, { error: GENERAL_ERROR });
    return sendJson(res, 200, { turnstileSiteKey: siteKey });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const submissionId = randomUUID();
  const submissionTime = new Date().toISOString();

  try {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      logStatus(submissionId, 'rejected', 'request_too_large');
      return sendJson(res, 413, { error: GENERAL_ERROR });
    }

    let body = req.body ?? {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: GENERAL_ERROR });
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) {
      logStatus(submissionId, 'rejected', 'invalid_request');
      return sendJson(res, 400, { error: GENERAL_ERROR });
    }

    if (clean(body.website, 200)) {
      logStatus(submissionId, 'accepted', 'honeypot');
      return sendJson(res, 200, { ok: true, message: SUCCESS_MESSAGE });
    }

    const { values, errors } = validate(body);
    if (Object.keys(errors).length) {
      logStatus(submissionId, 'rejected', 'validation');
      return sendJson(res, 400, { error: GENERAL_ERROR, errors });
    }

    const turnstileToken = clean(body.turnstileToken, 2_048);
    if (!turnstileToken) {
      logStatus(submissionId, 'rejected', 'turnstile_missing');
      return sendJson(res, 400, { error: TURNSTILE_ERROR, code: 'turnstile' });
    }

    const {
      CONTACT_FORM_FROM,
      CONTACT_FORM_TO,
      CONTACT_FORM_CC,
      TURNSTILE_SECRET_KEY,
      VERCEL_ENV,
    } = process.env;
    const environment = VERCEL_ENV || 'development';
    const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';
    const resendKeyPresent = Boolean(resendApiKey);
    const resendKeyPrefixValid = resendApiKey.startsWith('re_') && resendApiKey.length > 3;
    logResendConfiguration(submissionId, resendKeyPresent, resendKeyPrefixValid, environment);
    const to = splitRecipients(CONTACT_FORM_TO);
    const cc = splitRecipients(CONTACT_FORM_CC);
    if (!cc.some((address) => address.toLowerCase() === ADDITIONAL_CC_RECIPIENT)) {
      cc.push(ADDITIONAL_CC_RECIPIENT);
    }
    if (!resendKeyPresent || !resendKeyPrefixValid || !CONTACT_FORM_FROM || !to.length || !cc.length || !TURNSTILE_SECRET_KEY) {
      logStatus(submissionId, 'error', 'configuration');
      return sendJson(res, 503, { error: GENERAL_ERROR });
    }

    const siteverifyBody = new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    });
    const remoteIp = clean(req.headers['x-forwarded-for'], 160).split(',')[0].trim();
    if (remoteIp) siteverifyBody.set('remoteip', remoteIp);

    let verification;
    try {
      const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: siteverifyBody,
      });
      if (!verificationResponse.ok) throw new Error('siteverify_http');
      verification = await verificationResponse.json();
    } catch {
      logStatus(submissionId, 'error', 'turnstile_unavailable');
      return sendJson(res, 502, { error: TURNSTILE_ERROR, code: 'turnstile' });
    }

    const productionHostnames = new Set(['kfysmart.com', 'www.kfysmart.com']);
    const invalidProductionHostname = environment === 'production' && !productionHostnames.has(verification.hostname);
    const invalidAction = environment === 'production'
      ? verification.action !== 'contact_form'
      : Boolean(verification.action && verification.action !== 'contact_form');
    if (!verification.success || invalidProductionHostname || invalidAction) {
      logStatus(submissionId, 'rejected', 'turnstile_failed');
      return sendJson(res, 400, { error: TURNSTILE_ERROR, code: 'turnstile' });
    }

    const email = buildEmail({ values, submissionId, submissionTime, environment });
    const companyHeader = cleanHeader(values.companyName, 150);
    const productHeader = cleanHeader(values.productInterest, 100);
    const prefix = environment === 'production' ? '' : '[PREVIEW TEST] ';
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': submissionId,
        'User-Agent': 'KFY-SMART-Contact-Form/1.0',
      },
      body: JSON.stringify({
        from: CONTACT_FORM_FROM,
        to,
        cc,
        reply_to: values.businessEmail,
        subject: `${prefix}New Website Inquiry – ${companyHeader} – ${productHeader}`,
        html: email.html,
        text: email.text,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.json().catch(() => ({}));
      const resendErrorName = clean(resendError?.name, 50).replace(/[^a-z0-9_-]/gi, '') || 'unknown';
      logStatus(submissionId, 'error', `resend_${resendResponse.status}_${resendErrorName}`);
      return sendJson(res, 502, { error: GENERAL_ERROR });
    }

    logStatus(submissionId, 'sent', 'ok');
    return sendJson(res, 200, {
      ok: true,
      submissionId,
      message: SUCCESS_MESSAGE,
    });
  } catch {
    logStatus(submissionId, 'error', 'unexpected');
    return sendJson(res, 500, { error: GENERAL_ERROR });
  }
}
