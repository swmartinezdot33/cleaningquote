/**
 * CleanQuote.io Script (GHL)
 *
 * Adds a "Get Quote" button that opens your survey URL with the current contact
 * as query params (firstName, lastName, email, phone, address, contactId, etc.).
 * The survey/iframe reads those params and pre-fills the form.
 *
 * Usage in GHL: <script src="https://www.cleanquote.io/api/script/cleanquote.js?v=4"></script>
 * Optional: data-base-url, data-tool-slug, data-org-slug, data-button-text, data-container-selector
 */
(function () {
  'use strict';

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

  var baseUrl = (scriptTag && (scriptTag.getAttribute('data-base-url') || (scriptTag.dataset && scriptTag.dataset.baseUrl))) || '';
  var toolSlug = (scriptTag && (scriptTag.getAttribute('data-tool-slug') || (scriptTag.dataset && scriptTag.dataset.toolSlug))) || 'default';
  var orgSlug = (scriptTag && (scriptTag.getAttribute('data-org-slug') || (scriptTag.dataset && scriptTag.dataset.orgSlug))) || '';
  var buttonText = (scriptTag && (scriptTag.getAttribute('data-button-text') || (scriptTag.dataset && scriptTag.dataset.buttonText))) || 'Get Quote';
  var containerSelector = (scriptTag && (scriptTag.getAttribute('data-container-selector') || (scriptTag.dataset && scriptTag.dataset.containerSelector))) || '';

  baseUrl = String(baseUrl).trim().replace(/\/+$/, '');
  if (!baseUrl && scriptTag && scriptTag.src) {
    try {
      var scriptUrl = new URL(scriptTag.src);
      baseUrl = scriptUrl.origin;
    } catch (e) { /* ignore */ }
  }
  toolSlug = String(toolSlug).trim() || 'default';
  orgSlug = String(orgSlug).trim();
  buttonText = String(buttonText).trim() || 'Get Quote';

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

  function buildSurveyUrl(contact) {
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
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  function injectButton() {
    if (!baseUrl) {
      console.warn('CleanQuote script: set data-base-url to your survey origin (e.g. https://www.cleanquote.io) or load this script from that domain.');
      return;
    }
    var contact = getContact();
    var surveyUrl = buildSurveyUrl(contact);

    var link = document.createElement('a');
    link.id = 'cleanquote-get-quote-btn';
    link.href = surveyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = buttonText;
    link.style.cssText = 'display:inline-block;padding:10px 18px;background:#7c3aed;color:#fff!important;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;border:none;';
    link.addEventListener('mouseenter', function () { link.style.opacity = '0.9'; });
    link.addEventListener('mouseleave', function () { link.style.opacity = '1'; });

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

  function run() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectButton);
    } else {
      injectButton();
    }
  }
  run();
})();
