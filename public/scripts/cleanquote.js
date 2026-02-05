/**
 * CleanQuote.io GHL Quoter Button Script
 *
 * Adds a "Get Quote" button that opens your survey URL with the current contact
 * as query params (firstName, lastName, email, phone, address, contactId, etc.).
 *
 * AGENCY INSTALL: Add script in agency Custom JS (no data attrs). It runs on all sub-accounts
 * but only injects the button on sub-accounts that have CleanQuote connected. Auto-detects
 * current location from GHL URL.
 *
 * SINGLE LOCATION: data-location-id="YOUR_GHL_LOCATION_ID" for explicit location.
 *
 * MANUAL: data-base-url, data-org-slug, data-tool-slug, data-button-text, data-container-selector, data-open-in-iframe
 */
(function () {
  'use strict';
  var DEFAULT_ORIGIN = 'https://www.cleanquote.io';

  var scriptTag = document.currentScript;
  if (!scriptTag || !scriptTag.src) {
    for (var s = 0; s < document.scripts.length; s++) {
      if (document.scripts[s].src && document.scripts[s].src.indexOf('cleanquote') !== -1) {
        scriptTag = document.scripts[s];
        break;
      }
    }
  }
  if (!scriptTag) scriptTag = document.querySelector('script[src*="cleanquote"]');

  function getAttr(name, ds) {
    return (scriptTag && (scriptTag.getAttribute(name) || (scriptTag.dataset && scriptTag.dataset[ds]))) || '';
  }

  var locationId = getAttr('data-location-id', 'locationId') || '';
  var baseUrl = getAttr('data-base-url', 'baseUrl') || '';
  var toolSlug = getAttr('data-tool-slug', 'toolSlug') || 'default';
  var orgSlug = getAttr('data-org-slug', 'orgSlug') || '';
  var buttonText = (getAttr('data-button-text', 'buttonText') || 'Get Quote').trim();
  var containerSelector = getAttr('data-container-selector', 'containerSelector') || '';
  var openInIframe = (getAttr('data-open-in-iframe', 'openInIframe') || '') === 'true';

  function getScriptOrigin() {
    if (scriptTag && scriptTag.src) {
      try { return new URL(scriptTag.src).origin; } catch (e) {}
    }
    for (var i = 0; i < document.scripts.length; i++) {
      var s = document.scripts[i];
      if (s.src && s.src.indexOf('cleanquote') !== -1) {
        try { return new URL(s.src).origin; } catch (e) {}
        break;
      }
    }
    return DEFAULT_ORIGIN;
  }

  var scriptOrigin = getScriptOrigin();
  baseUrl = String(baseUrl).trim().replace(/\/+$/, '') || scriptOrigin;
  toolSlug = String(toolSlug).trim() || 'default';
  orgSlug = String(orgSlug).trim();
  buttonText = buttonText || 'Get Quote';

  function getLocationIdFromUrl() {
    try {
      var href = typeof window !== 'undefined' && window.location ? window.location.href : '';
      if (!href) return '';
      var m = href.match(/\/(?:v2\/)?(?:location|oauth)\/([a-zA-Z0-9]{16,30})(?:\/|$|\?)/);
      if (m && m[1]) return m[1];
      var qs = typeof window !== 'undefined' && window.location && window.location.search ? window.location.search : '';
      m = qs.match(/[?&]locationId=([a-zA-Z0-9]{16,30})(?:&|$)/);
      if (m && m[1]) return m[1];
      m = qs.match(/[?&]location_id=([a-zA-Z0-9]{16,30})(?:&|$)/);
      if (m && m[1]) return m[1];
      if (typeof window !== 'undefined' && (window.__GHL_LOCATION_ID__ || window.ghlLocationId)) {
        return String(window.__GHL_LOCATION_ID__ || window.ghlLocationId || '').trim();
      }
    } catch (e) {}
    return '';
  }

  function getContact() {
    var c = window.__CONTACT__ || window.contact || window.ghlContact;
    if (c && typeof c === 'object') return c;
    var el = document.querySelector('[data-contact-id]');
    if (el) {
      var o = {};
      o.id = el.getAttribute('data-contact-id') || el.dataset.contactId;
      o.firstName = (el.getAttribute('data-contact-first-name') || el.dataset.contactFirstName) || '';
      o.lastName = (el.getAttribute('data-contact-last-name') || el.dataset.contactLastName) || '';
      o.email = (el.getAttribute('data-contact-email') || el.dataset.contactEmail) || '';
      o.phone = (el.getAttribute('data-contact-phone') || el.dataset.contactPhone) || '';
      o.address1 = (el.getAttribute('data-contact-address') || el.dataset.contactAddress) || '';
      o.city = (el.getAttribute('data-contact-city') || el.dataset.contactCity) || '';
      o.state = (el.getAttribute('data-contact-state') || el.dataset.contactState) || '';
      o.postalCode = (el.getAttribute('data-contact-postal-code') || el.dataset.contactPostalCode) || '';
      return o;
    }
    return null;
  }

  function buildSurveyUrl(contact, forIframe) {
    var path = orgSlug ? 't/' + encodeURIComponent(orgSlug) + '/' + encodeURIComponent(toolSlug) : 't/' + encodeURIComponent(toolSlug);
    var url = baseUrl + '/' + path;
    var params = [];
    if (contact) {
      if (contact.id) params.push('contactId=' + encodeURIComponent(contact.id));
      if (contact.firstName) params.push('firstName=' + encodeURIComponent(contact.firstName));
      if (contact.lastName) params.push('lastName=' + encodeURIComponent(contact.lastName));
      if (contact.email) params.push('email=' + encodeURIComponent(contact.email));
      if (contact.phone) params.push('phone=' + encodeURIComponent(contact.phone));
      var addr = contact.address1 || contact.address;
      if (addr) params.push('address=' + encodeURIComponent(addr));
      if (contact.city) params.push('city=' + encodeURIComponent(contact.city));
      if (contact.state) params.push('state=' + encodeURIComponent(contact.state));
      if (contact.postalCode) params.push('postalCode=' + encodeURIComponent(contact.postalCode));
    }
    if (forIframe) params.push('embedded=true');
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  function injectButton() {
    var contact = getContact();
    var surveyUrl = buildSurveyUrl(contact, openInIframe);

    var container;
    if (containerSelector) {
      container = document.querySelector(containerSelector);
    }
    if (!container && document.body) {
      container = document.createElement('div');
      container.id = 'cleanquote-container';
      container.className = 'cleanquote-container';
      container.style.cssText = 'margin:12px 0;';
      document.body.appendChild(container);
    }

    if (openInIframe) {
      var link = document.createElement('button');
      link.type = 'button';
      link.id = 'cleanquote-get-quote-btn';
      link.textContent = buttonText;
      link.style.cssText = 'display:inline-block;padding:10px 18px;background:#7c3aed;color:#fff!important;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;border:none;';
      link.addEventListener('mouseenter', function () { link.style.opacity = '0.9'; });
      link.addEventListener('mouseleave', function () { link.style.opacity = '1'; });
      var iframeContainer = document.createElement('div');
      iframeContainer.id = 'cleanquote-iframe-container';
      iframeContainer.style.cssText = 'margin-top:12px;display:none;';
      link.addEventListener('click', function () {
        if (iframeContainer.querySelector('iframe')) {
          iframeContainer.style.display = iframeContainer.style.display === 'none' ? 'block' : 'none';
          return;
        }
        var iframe = document.createElement('iframe');
        iframe.id = 'cleanquote-survey-iframe';
        iframe.src = surveyUrl;
        iframe.title = 'Get Quote';
        iframe.style.cssText = 'width:100%;min-height:600px;border:1px solid #e5e7eb;border-radius:8px;';
        iframeContainer.appendChild(iframe);
        iframeContainer.style.display = 'block';
      });
      function appendIframeUI() {
        var c = container || (document.body ? (document.getElementById('cleanquote-container') || (function() {
          var div = document.createElement('div');
          div.id = 'cleanquote-container';
          div.className = 'cleanquote-container';
          div.style.cssText = 'margin:12px 0;';
          document.body.appendChild(div);
          return div;
        })()) : null);
        if (c) {
          c.appendChild(link);
          c.appendChild(iframeContainer);
        }
      }
      if (container || document.body) {
        appendIframeUI();
      } else {
        document.addEventListener('DOMContentLoaded', appendIframeUI);
        var attempts = 0;
        var iv = setInterval(function() {
          attempts++;
          if (document.body) { clearInterval(iv); appendIframeUI(); }
          else if (attempts > 50) clearInterval(iv);
        }, 100);
      }
      return;
    }

    var link = document.createElement('a');
    link.id = 'cleanquote-get-quote-btn';
    link.href = surveyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = buttonText;
    link.style.cssText = 'display:inline-block;padding:10px 18px;background:#7c3aed;color:#fff!important;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;border:none;';
    link.addEventListener('mouseenter', function () { link.style.opacity = '0.9'; });
    link.addEventListener('mouseleave', function () { link.style.opacity = '1'; });

    if (container) {
      container.appendChild(link);
    } else {
      function tryAppend() {
        if (link.parentNode) return;
        var c = containerSelector ? document.querySelector(containerSelector) : document.getElementById('cleanquote-container');
        if (!c && document.body) {
          c = document.createElement('div');
          c.id = 'cleanquote-container';
          c.className = 'cleanquote-container';
          c.style.cssText = 'margin:12px 0;';
          document.body.appendChild(c);
        }
        if (c) c.appendChild(link);
      }
      if (document.body) {
        tryAppend();
      } else {
        document.addEventListener('DOMContentLoaded', tryAppend);
        var attempts = 0;
        var interval = setInterval(function () {
          attempts++;
          if (document.body) {
            clearInterval(interval);
            tryAppend();
          } else if (attempts > 50) clearInterval(interval);
        }, 100);
      }
    }
  }

  function doInject() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectButton);
      } else {
        injectButton();
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('CleanQuote script error:', err);
      }
    }
  }

  function run() {
    var hasManualConfig = getAttr('data-org-slug', 'orgSlug') || getAttr('data-tool-slug', 'toolSlug');
    var effectiveLocationId = locationId || getLocationIdFromUrl();

    if (hasManualConfig) {
      doInject();
      return;
    }

    if (!effectiveLocationId) {
      return;
    }

    var configUrl = scriptOrigin + '/api/script/config?locationId=' + encodeURIComponent(effectiveLocationId);
    fetch(configUrl)
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (cfg) {
        if (!cfg || !cfg.baseUrl) return;
        baseUrl = String(cfg.baseUrl).replace(/\/+$/, '');
        orgSlug = (cfg.orgSlug && String(cfg.orgSlug).trim()) || '';
        toolSlug = (cfg.toolSlug && String(cfg.toolSlug).trim()) || 'default';
        doInject();
      })
      .catch(function () {});
  }
  run();
})();
