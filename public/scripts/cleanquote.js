/**
 * CleanQuote.io Script
 *
 * Single script for CleanQuote integrations (e.g. GoHighLevel). Load it once in GHL
 * (Custom Code / Tracking Code / Scripts, or contact detail page script section).
 * Currently adds a "Get Quote" button that opens your CleanQuote survey with the
 * current contact's data pre-filled. More features can be added to this script over time.
 *
 * HOST THE SCRIPT:
 * 1. Upload this file to your site (e.g. https://yourdomain.com/scripts/cleanquote.js).
 * 2. In GHL, add a single script tag (see README or comment below).
 *
 * SCRIPT TAG IN GHL (replace with your real script URL and options):
 * <script src="https://yourdomain.com/scripts/cleanquote.js"
 *   data-base-url="https://your-cleanquote-domain.com"
 *   data-tool-slug="default"
 *   data-org-slug=""
 *   data-button-text="Get Quote"
 *   data-container-selector="#cleanquote-container"
 *   crossorigin="anonymous"></script>
 *
 * OPTIONS (data attributes on the script tag):
 * - data-base-url (required) – Your CleanQuote base URL (e.g. https://quote.yourcompany.com).
 * - data-tool-slug (optional) – Tool slug for the survey. Default: "default".
 * - data-org-slug (optional) – Org slug for org-scoped URLs (/t/orgSlug/toolSlug). Omit if not using org scope.
 * - data-button-text (optional) – Button label. Default: "Get Quote".
 * - data-container-selector (optional) – CSS selector where the button is inserted (e.g. #cleanquote-container). If omitted, a container is appended to document.body.
 *
 * CONTACT DATA:
 * The script looks for contact data in: window.__CONTACT__, window.contact, window.ghlContact,
 * or from DOM elements with [data-contact-id], [data-contact-first-name], etc. If your GHL
 * setup exposes the contact elsewhere, set window.__CONTACT__ before this script runs, e.g.:
 *   window.__CONTACT__ = { id: "xxx", firstName: "...", lastName: "...", email: "...", phone: "...", address1: "...", city: "...", state: "...", postalCode: "..." };
 */
(function () {
  'use strict';

  var scriptTag = document.currentScript || document.querySelector('script[src*="cleanquote.js"]');
  var baseUrl = (scriptTag && (scriptTag.getAttribute('data-base-url') || scriptTag.dataset.baseUrl)) || '';
  var toolSlug = (scriptTag && (scriptTag.getAttribute('data-tool-slug') || scriptTag.dataset.toolSlug)) || 'default';
  var orgSlug = (scriptTag && (scriptTag.getAttribute('data-org-slug') || scriptTag.dataset.orgSlug)) || '';
  var buttonText = (scriptTag && (scriptTag.getAttribute('data-button-text') || scriptTag.dataset.buttonText)) || 'Get Quote';
  var containerSelector = (scriptTag && (scriptTag.getAttribute('data-container-selector') || scriptTag.dataset.containerSelector)) || '';

  baseUrl = String(baseUrl).trim().replace(/\/+$/, '');
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
      console.warn('CleanQuote script: data-base-url is required. Add data-base-url="https://your-cleanquote-domain.com" to the script tag.');
      return;
    }
    var contact = getContact();
    var surveyUrl = buildSurveyUrl(contact);

    var link = document.createElement('a');
    link.href = surveyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = buttonText;
    link.style.cssText = 'display:inline-block;padding:10px 18px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;border:none;';
    link.addEventListener('mouseenter', function () { link.style.opacity = '0.9'; });
    link.addEventListener('mouseleave', function () { link.style.opacity = '1'; });

    var container;
    if (containerSelector) {
      container = document.querySelector(containerSelector);
    }
    if (!container) {
      container = document.createElement('div');
      container.className = 'cleanquote-container';
      container.style.cssText = 'margin:12px 0;';
      var body = document.body;
      if (body) body.appendChild(container);
      else document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(container); });
    }
    container.appendChild(link);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
