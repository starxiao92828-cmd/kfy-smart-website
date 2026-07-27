(function () {
  'use strict';

  var CONTAINER_ID = 'GTM-MXMDWLG2';
  var STORAGE_KEY = 'kfy_analytics_consent';
  var COOKIE_NAME = 'kfy_analytics_consent';
  var ACCEPTED = 'accepted';
  var REJECTED = 'rejected';
  var banner;

  function queueGoogleCommand() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function consentState(analyticsState) {
    return {
      analytics_storage: analyticsState,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
  }

  function setDefaultConsent() {
    queueGoogleCommand('consent', 'default', consentState('denied'));
  }

  function updateConsent(preference) {
    queueGoogleCommand(
      'consent',
      'update',
      consentState(preference === ACCEPTED ? 'granted' : 'denied')
    );
  }

  function readPreference() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === ACCEPTED || stored === REJECTED) {
        return stored;
      }
    } catch (error) {
      // Fall back to the first-party preference cookie below.
    }

    var match = document.cookie.match(
      new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)')
    );
    var cookieValue = match ? decodeURIComponent(match[1]) : '';
    return cookieValue === ACCEPTED || cookieValue === REJECTED
      ? cookieValue
      : null;
  }

  function writePreference(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      // The cookie below preserves the choice if localStorage is unavailable.
    }

    document.cookie =
      COOKIE_NAME +
      '=' +
      encodeURIComponent(value) +
      '; Max-Age=31536000; Path=/; SameSite=Lax' +
      (window.location.protocol === 'https:' ? '; Secure' : '');
  }

  function isGtmLoaded() {
    return Boolean(
      window.__KFY_ANALYTICS_GTM_LOADED__ ||
        document.querySelector('script[data-kfy-gtm="' + CONTAINER_ID + '"]')
    );
  }

  function isGoogleAnalyticsCookie(name) {
    return (
      name === '_ga' ||
      name.indexOf('_ga_') === 0 ||
      name === '_gid' ||
      name.indexOf('_gid_') === 0 ||
      name === '_gat' ||
      name.indexOf('_gat_') === 0
    );
  }

  function cookiePaths() {
    var paths = ['/'];
    var segments = window.location.pathname.split('/').filter(Boolean);
    var currentPath = '';

    segments.forEach(function (segment) {
      currentPath += '/' + segment;
      paths.push(currentPath);
      paths.push(currentPath + '/');
    });

    return paths.filter(function (path, index, allPaths) {
      return allPaths.indexOf(path) === index;
    });
  }

  function cookieDomains() {
    var hostname = window.location.hostname;
    var domains = ['', hostname, '.' + hostname];

    if (hostname === 'kfysmart.com' || hostname.endsWith('.kfysmart.com')) {
      domains.push(
        'kfysmart.com',
        '.kfysmart.com',
        'www.kfysmart.com',
        '.www.kfysmart.com'
      );
    }

    return domains.filter(function (domain, index, allDomains) {
      return allDomains.indexOf(domain) === index;
    });
  }

  function deleteGoogleAnalyticsCookies() {
    var cookieNames = document.cookie
      .split(';')
      .map(function (cookie) {
        return cookie.split('=')[0].trim();
      })
      .filter(isGoogleAnalyticsCookie);
    var paths = cookiePaths();
    var domains = cookieDomains();

    cookieNames.forEach(function (name) {
      paths.forEach(function (path) {
        domains.forEach(function (domain) {
          document.cookie =
            name +
            '=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=' +
            path +
            (domain ? '; Domain=' + domain : '') +
            '; SameSite=Lax';
        });
      });
    });
  }

  function loadGtm() {
    if (readPreference() !== ACCEPTED || isGtmLoaded()) {
      return;
    }

    window.__KFY_ANALYTICS_GTM_LOADED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    var script = document.createElement('script');
    script.async = true;
    script.src =
      'https://www.googletagmanager.com/gtm.js?id=' +
      encodeURIComponent(CONTAINER_ID);
    script.dataset.kfyGtm = CONTAINER_ID;
    document.head.appendChild(script);
  }

  function hideBanner() {
    if (banner) {
      banner.hidden = true;
    }
  }

  function showBanner(shouldFocus) {
    if (!banner) {
      return;
    }

    banner.hidden = false;
    var primaryButton = shouldFocus
      ? banner.querySelector('[data-consent-accept]')
      : null;
    if (primaryButton && typeof primaryButton.focus === 'function') {
      window.requestAnimationFrame(function () {
        primaryButton.focus({ preventScroll: true });
      });
    }
  }

  function createBanner() {
    banner = document.createElement('section');
    banner.className = 'analytics-consent';
    banner.hidden = true;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'analytics-consent-title');
    banner.innerHTML =
      '<div class="analytics-consent__copy">' +
      '<h2 id="analytics-consent-title">Analytics cookies</h2>' +
      '<p>We use Google Analytics cookies to understand how visitors use our website and improve our services. Learn more in our <a href="/privacy-policy/">Privacy Policy</a>.</p>' +
      '</div>' +
      '<div class="analytics-consent__actions">' +
      '<button class="analytics-consent__accept" type="button" data-consent-accept>Accept Analytics</button>' +
      '<button class="analytics-consent__reject" type="button" data-consent-reject>Reject</button>' +
      '</div>';

    banner
      .querySelector('[data-consent-accept]')
      .addEventListener('click', function () {
        updateConsent(ACCEPTED);
        writePreference(ACCEPTED);
        hideBanner();
        loadGtm();
      });

    banner
      .querySelector('[data-consent-reject]')
      .addEventListener('click', function () {
        var mustReload = isGtmLoaded();
        updateConsent(REJECTED);
        deleteGoogleAnalyticsCookies();
        writePreference(REJECTED);
        hideBanner();
        if (mustReload) {
          window.location.reload();
        }
      });

    document.body.appendChild(banner);
  }

  function createFooterControl() {
    var footerLegal = document.querySelector(
      '.site-footer .copyright > span:first-child'
    );
    if (!footerLegal || footerLegal.querySelector('[data-cookie-settings]')) {
      return;
    }

    var separator = document.createTextNode(' | ');
    var button = document.createElement('button');
    button.className = 'cookie-settings-button';
    button.type = 'button';
    button.textContent = 'Cookie Settings';
    button.dataset.cookieSettings = '';
    button.addEventListener('click', function () {
      showBanner(true);
    });
    footerLegal.appendChild(separator);
    footerLegal.appendChild(button);
  }

  function mountConsentUi() {
    createBanner();
    createFooterControl();
    if (!readPreference()) {
      showBanner(false);
    }
  }

  setDefaultConsent();
  var storedPreference = readPreference();
  if (storedPreference === ACCEPTED) {
    updateConsent(ACCEPTED);
    loadGtm();
  } else if (storedPreference === REJECTED) {
    updateConsent(REJECTED);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountConsentUi, {
      once: true
    });
  } else {
    mountConsentUi();
  }
})();
