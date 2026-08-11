(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-form-status]');
  const turnstileFrame = form.querySelector('[data-turnstile]');
  const productOptions = new Set([
    'Adjustable Bed Bases',
    'Smart Beds',
    'Smart Mattresses',
    'OEM / ODM & Private Label',
    'Hotel / Project Solutions',
    'Other / Not Sure',
  ]);
  let countryNames = new Set();
  const fields = {
    name: form.elements.name,
    businessEmail: form.elements.businessEmail,
    companyName: form.elements.companyName,
    country: form.elements.country,
    productInterest: form.elements.productInterest,
    specificProduct: form.elements.specificProduct,
    estimatedQuantity: form.elements.estimatedQuantity,
    phone: form.elements.phone,
    message: form.elements.message,
    privacyAgreement: form.elements.privacyAgreement,
  };
  let turnstileToken = '';
  let turnstileWidgetId;

  const messages = {
    success: 'Thank you for contacting KFY SMART. Your inquiry has been submitted successfully. Our team will review your requirements and respond within one business day.',
    general: 'We could not submit your inquiry. Please check the form and try again, or contact us directly by email.',
    turnstile: 'Security verification could not be completed. Please verify again and resubmit the form.',
  };

  const hasAnalyticsConsent = () => {
    try {
      if (window.localStorage.getItem('kfy_analytics_consent') === 'accepted') return true;
    } catch {
      // Fall back to the first-party cookie when localStorage is unavailable.
    }

    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .some((cookie) => cookie === 'kfy_analytics_consent=accepted');
  };

  const pushLeadAnalyticsEvent = (payload) => {
    if (!hasAnalyticsConsent()) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'kfy_generate_lead',
      product_category: payload.productInterest || 'not_specified',
      product_model: payload.productModel || 'not_specified',
      page_path: payload.sourcePage || window.location.pathname,
      language: document.documentElement.lang || 'en',
    });
  };

  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status${type ? ` ${type}` : ''}`;
  };

  const setFieldError = (fieldName, message = '') => {
    const field = fields[fieldName];
    const error = form.querySelector(`#${fieldName}-error`);
    if (!field || !error) return;
    error.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  };

  const validateField = (fieldName) => {
    const field = fields[fieldName];
    if (!field) return true;
    const value = field.type === 'checkbox' ? field.checked : field.value.trim();
    let error = '';

    if (fieldName === 'name' && (value.length < 2 || value.length > 100)) error = 'Enter a name between 2 and 100 characters.';
    if (fieldName === 'businessEmail' && (!field.validity.valid || value.length > 254)) error = 'Enter a valid business email address.';
    if (fieldName === 'companyName' && (value.length < 2 || value.length > 150)) error = 'Enter a company name between 2 and 150 characters.';
    if (fieldName === 'country' && !countryNames.has(value)) error = 'Select a valid country or region from the list.';
    if (fieldName === 'productInterest' && !productOptions.has(value)) error = 'Select a valid product interest.';
    if (fieldName === 'specificProduct' && value.length > 100) error = 'Use 100 characters or fewer.';
    if (fieldName === 'estimatedQuantity' && value.length > 100) error = 'Use 100 characters or fewer.';
    if (fieldName === 'phone' && value.length > 50) error = 'Use 50 characters or fewer.';
    if (fieldName === 'message' && (value.length < 10 || value.length > 2000)) error = 'Enter a message between 10 and 2,000 characters.';
    if (fieldName === 'privacyAgreement' && !value) error = 'You must acknowledge the Privacy Policy before submitting.';

    setFieldError(fieldName, error);
    return !error;
  };

  const validateForm = () => {
    const invalid = Object.keys(fields).filter((fieldName) => !validateField(fieldName));
    if (invalid.length) fields[invalid[0]].focus();
    return invalid.length === 0;
  };

  Object.entries(fields).forEach(([fieldName, field]) => {
    const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'blur';
    field.addEventListener(eventName, () => validateField(fieldName));
    if (field.type !== 'checkbox' && field.tagName !== 'SELECT') {
      field.addEventListener('input', () => {
        if (field.hasAttribute('aria-invalid')) validateField(fieldName);
      });
    }
  });

  const populateCountries = () => {
    const datalist = document.querySelector('#country-options');
    if (!datalist) return;
    const fallback = ['Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany', 'India', 'Italy', 'Japan', 'Mexico', 'Netherlands', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'United Arab Emirates', 'United Kingdom', 'United States'];
    const codes = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
    let names = fallback;
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      names = codes.map((code) => displayNames.of(code)).filter(Boolean).sort((a, b) => a.localeCompare(b));
    } catch {
      // The fallback list keeps the datalist usable in older browsers.
    }
    countryNames = new Set(names);
    datalist.replaceChildren(...names.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    }));
  };

  const prefillFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const product = (params.get('product') || '').trim();
    const model = (params.get('model') || '').trim();
    const category = (params.get('category') || '').trim().toLowerCase();
    const categoryMap = {
      'adjustable-bed-bases': 'Adjustable Bed Bases',
      'adjustable bed bases': 'Adjustable Bed Bases',
      'smart-beds': 'Smart Beds',
      'smart beds': 'Smart Beds',
      'smart-mattresses': 'Smart Mattresses',
      'smart mattresses': 'Smart Mattresses',
      'oem-odm': 'OEM / ODM & Private Label',
      'oem / odm & private label': 'OEM / ODM & Private Label',
      'hotel-project-solutions': 'Hotel / Project Solutions',
      'hotel / project solutions': 'Hotel / Project Solutions',
    };
    const modelValue = (model || product).slice(0, 100);
    if (modelValue) fields.specificProduct.value = modelValue;

    let interest = categoryMap[category];
    if (!interest && modelValue) {
      const prefix = modelValue.charAt(0).toUpperCase();
      interest = { E: 'Adjustable Bed Bases', S: 'Smart Beds', W: 'Smart Mattresses' }[prefix];
    }
    if (interest && productOptions.has(interest)) fields.productInterest.value = interest;
  };

  const loadTurnstile = () => {
    if (window.turnstile) return Promise.resolve();
    if (window.__kfyTurnstilePromise) return window.__kfyTurnstilePromise;
    window.__kfyTurnstilePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kfy-turnstile]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.kfyTurnstile = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    });
    return window.__kfyTurnstilePromise;
  };

  const resetTurnstile = () => {
    turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== undefined) window.turnstile.reset(turnstileWidgetId);
  };

  const initializeTurnstile = async () => {
    submitButton.disabled = true;
    try {
      const configResponse = await fetch('/api/contact', { headers: { Accept: 'application/json' } });
      if (!configResponse.ok) throw new Error('config');
      const config = await configResponse.json();
      if (!config.turnstileSiteKey) throw new Error('config');
      await loadTurnstile();
      turnstileWidgetId = window.turnstile.render(turnstileFrame, {
        sitekey: config.turnstileSiteKey,
        action: 'contact_form',
        callback(token) {
          turnstileToken = token;
          setStatus('');
        },
        'expired-callback'() {
          turnstileToken = '';
          setStatus(messages.turnstile, 'error');
        },
        'error-callback'() {
          turnstileToken = '';
          setStatus(messages.turnstile, 'error');
        },
      });
      submitButton.disabled = false;
    } catch {
      setStatus(messages.turnstile, 'error');
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    if (!validateForm()) return;
    if (!turnstileToken) {
      setStatus(messages.turnstile, 'error');
      turnstileFrame.focus();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const payload = {
      name: fields.name.value,
      businessEmail: fields.businessEmail.value,
      companyName: fields.companyName.value,
      country: fields.country.value,
      productInterest: fields.productInterest.value,
      specificProduct: fields.specificProduct.value,
      estimatedQuantity: fields.estimatedQuantity.value,
      phone: fields.phone.value,
      message: fields.message.value,
      privacyAgreement: fields.privacyAgreement.checked,
      website: form.elements.website.value,
      turnstileToken,
      sourcePage: window.location.pathname,
      pageUrl: window.location.href,
      productModel: (params.get('model') || params.get('product') || fields.specificProduct.value).slice(0, 100),
      referrer: document.referrer,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
          const firstInvalid = Object.keys(result.errors).find((fieldName) => fields[fieldName]);
          if (firstInvalid) fields[firstInvalid].focus();
        }
        const isTurnstileError = result.code === 'turnstile';
        setStatus(isTurnstileError ? messages.turnstile : messages.general, 'error');
        resetTurnstile();
        return;
      }

      const isConfirmedSubmission = response.ok
        && result
        && result.ok === true
        && typeof result.submissionId === 'string'
        && result.submissionId.trim() !== '';
      if (isConfirmedSubmission) pushLeadAnalyticsEvent(payload);
      form.reset();
      Object.keys(fields).forEach((fieldName) => setFieldError(fieldName));
      setStatus(messages.success, 'success');
      status.focus();
      resetTurnstile();
    } catch {
      setStatus(messages.general, 'error');
      resetTurnstile();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Inquiry';
    }
  });

  populateCountries();
  prefillFromUrl();
  initializeTurnstile();
})();
