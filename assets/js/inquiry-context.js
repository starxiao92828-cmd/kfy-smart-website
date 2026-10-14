(() => {
  'use strict';

  const storageKey = 'kfy_inquiry_context_v1';
  const lifetime = 30 * 60 * 1000;
  const campaignFields = {
    utmSource: 'utm_source',
    utmMedium: 'utm_medium',
    utmCampaign: 'utm_campaign',
    utmContent: 'utm_content',
    utmTerm: 'utm_term',
  };
  const clean = (value) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 150);

  const hasConsent = () => {
    try {
      const preference = window.localStorage.getItem('kfy_analytics_consent');
      if (preference === 'accepted') return true;
      if (preference === 'rejected') return false;
    } catch {
      // The consent cookie also works when localStorage is blocked.
    }
    return document.cookie.split(';').some((cookie) => cookie.trim() === 'kfy_analytics_consent=accepted');
  };

  const clear = () => {
    try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
  };

  const localPath = (value) => {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
    try {
      const url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? url.pathname.slice(0, 300) : '';
    } catch { return ''; }
  };

  const referrer = () => {
    try {
      const url = new URL(document.referrer);
      if (!['https:', 'http:'].includes(url.protocol)) return '';
      return `${url.origin}${url.pathname}`.slice(0, 500);
    } catch { return ''; }
  };

  const campaignFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const campaign = Object.fromEntries(Object.entries(campaignFields).map(([field, param]) => [field, clean(params.get(param))]));
    return Object.values(campaign).some(Boolean) ? campaign : null;
  };

  const read = () => {
    if (!hasConsent()) { clear(); return null; }
    try {
      const value = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
      if (!value || !Number.isFinite(value.lastSeen) || Date.now() - value.lastSeen > lifetime || value.lastSeen > Date.now()) {
        clear();
        return null;
      }
      return {
        ...Object.fromEntries(Object.keys(campaignFields).map((field) => [field, clean(value[field])])),
        landingPage: localPath(value.landingPage),
        referrer: String(value.referrer || '').slice(0, 500),
        lastSeen: value.lastSeen,
      };
    } catch { clear(); return null; }
  };

  const capture = () => {
    if (!hasConsent()) { clear(); return; }
    const existing = read();
    const campaign = campaignFromUrl();
    const value = campaign || !existing
      ? { ...campaign, landingPage: window.location.pathname, referrer: referrer(), lastSeen: Date.now() }
      : { ...existing, lastSeen: Date.now() };
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Navigation still works. */ }
  };

  const get = () => {
    const params = new URLSearchParams(window.location.search);
    const stored = read();
    const currentCampaign = campaignFromUrl();
    const campaign = currentCampaign || stored || {};
    let previousPage = '';
    try {
      const previous = new URL(document.referrer);
      if (previous.origin === window.location.origin) previousPage = previous.pathname;
    } catch { /* Direct entry has no referrer. */ }
    return {
      ...Object.fromEntries(Object.keys(campaignFields).map((field) => [field, clean(campaign[field])])),
      sourcePage: localPath(params.get('source')) || localPath(previousPage) || window.location.pathname,
      landingPage: stored?.landingPage || window.location.pathname,
      referrer: stored?.referrer || referrer(),
    };
  };

  const categoryForPage = () => {
    const path = window.location.pathname;
    if (path.startsWith('/products/smart-mattresses/') || path.startsWith('/news/smart-mattress-')) return 'smart-mattresses';
    if (path.startsWith('/products/smart-beds/')) return 'smart-beds';
    if (path.startsWith('/products/adjustable-bed-bases/') || path.startsWith('/news/adjustable-bed-base-')) return 'adjustable-bed-bases';
    return '';
  };

  // Source is a local page path, not a new campaign. Internal links never receive UTM parameters.
  if (window.location.pathname !== '/contact/') {
    document.querySelectorAll('a[href]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href'), window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== '/contact/') return;
        if (!localPath(url.searchParams.get('source'))) url.searchParams.set('source', window.location.pathname);
        const category = categoryForPage();
        if (category && !url.searchParams.has('category')) url.searchParams.set('category', category);
        link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
      } catch { /* Leave an unrecognized link alone. */ }
    });
  }

  window.KFY_INQUIRY_CONTEXT = { get };
  capture();
  // Run after the existing consent button handler writes the visitor's choice.
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-consent-accept]')) capture();
    if (event.target.closest?.('[data-consent-reject]')) clear();
  });
})();
