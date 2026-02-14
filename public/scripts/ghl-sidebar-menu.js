/**
 * CleanQuote.io GHL Sidebar Menu Script
 *
 * Injects extra sidebar menu items (Dashboard, Quotes, Contacts, Inbox, etc.) into the
 * GHL sidebar so users can navigate to CleanQuote pages without leaving GHL. Uses the
 * same iframe that the single marketplace app menu item opens; on click we set the
 * iframe src to /v2/location/{locationId}?page=... so the app loads the correct page.
 *
 * INSTALL: GHL Agency → Settings → Company → Custom JS. Add:
 *   <script src="https://www.cleanquote.io/api/script/ghl-sidebar-menu.js"></script>
 *
 * Requires location (sub-account) context; menu items only appear when locationId is available.
 * If GHL updates their UI, sidebar/iframe selectors may need updating (see comments below).
 */
(function () {
  'use strict';

  var DEFAULT_BASE = 'https://www.cleanquote.io';
  var CONTAINER_ID = 'cleanquote-ghl-sidebar-menu';
  var MENU_ITEMS = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'inbox', label: 'Inbox' },
    { page: 'contacts', label: 'Contacts' },
    { page: 'leads', label: 'Leads' },
    { page: 'quotes', label: 'Quotes' },
    { page: 'tools', label: 'Tools' },
    { page: 'service-areas', label: 'Service Areas' },
    { page: 'pricing', label: 'Pricing' },
    { page: 'settings', label: 'Settings' },
  ];

  function getBaseUrl() {
    if (typeof window !== 'undefined' && window.CLEANQUOTE_SIDEBAR_BASE) {
      return String(window.CLEANQUOTE_SIDEBAR_BASE).replace(/\/+$/, '');
    }
    var scriptTag = document.querySelector('script[src*="ghl-sidebar-menu"]');
    if (scriptTag && scriptTag.src) {
      try {
        return new URL(scriptTag.src).origin;
      } catch (e) {}
    }
    return DEFAULT_BASE;
  }

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

  function findCleanQuoteIframe() {
    try {
      var iframes = document.querySelectorAll('iframe[src*="cleanquote"]');
      for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].src && iframes[i].src.indexOf('cleanquote') !== -1) {
          return iframes[i];
        }
      }
    } catch (e) {}
    return null;
  }

  function navigateToPage(baseUrl, locationId, pageKey) {
    var url = baseUrl + '/v2/location/' + encodeURIComponent(locationId) + '?page=' + encodeURIComponent(pageKey);
    var iframe = findCleanQuoteIframe();
    if (iframe) {
      iframe.src = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function normText(s) {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getRow(el) {
    if (!el) return null;
    return (
      el.closest('li') ||
      el.closest('[role="listitem"]') ||
      el.closest('.nav-item') ||
      el.closest('.menu-item') ||
      el.closest('.sidebar-item') ||
      el
    );
  }

  /** Find the existing CleanQuote sidebar entry (e.g. "CleanQuote.io Snap...") so we insert our items right under it. */
  function findCleanQuoteSidebarRow() {
    var root = document.querySelector('aside') || document.querySelector('nav') || document.body;
    if (!root) return null;
    var candidates = root.querySelectorAll('a, [role="link"], button, [data-cq-group]');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var text = normText(el.textContent || '');
      var href = (el.getAttribute && el.getAttribute('href')) || '';
      if (text.indexOf('cleanquote') !== -1 || href.indexOf('cleanquote') !== -1 || href.indexOf('custom-page-link') !== -1) {
        var row = getRow(el);
        if (row) return row;
      }
    }
    return null;
  }

  function injectSidebarMenu(locationId, baseUrl) {
    if (document.getElementById(CONTAINER_ID)) return;

    var container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.setAttribute('data-cleanquote-sidebar', '1');
    container.style.cssText = 'margin:0;padding:0;';

    var list = document.createElement('ul');
    list.style.cssText = 'list-style:none;margin:0;padding:0;';
    list.setAttribute('role', 'list');

    var itemStyle = 'display:block;width:100%;text-align:left;background:transparent;border:none;cursor:pointer;padding:8px 12px;padding-left:24px;font-size:14px;color:inherit;font-family:inherit;';
    var hoverBg = 'rgba(255,255,255,0.08)';

    for (var i = 0; i < MENU_ITEMS.length; i++) {
      var item = MENU_ITEMS[i];
      var li = document.createElement('li');
      li.style.cssText = 'margin:0;padding:0;';
      var link = document.createElement('button');
      link.type = 'button';
      link.textContent = item.label;
      link.setAttribute('data-cq-page', item.page);
      link.style.cssText = itemStyle;
      link.addEventListener('mouseenter', function () {
        this.style.backgroundColor = hoverBg;
      });
      link.addEventListener('mouseleave', function () {
        this.style.backgroundColor = 'transparent';
      });
      link.addEventListener('click', (function (pageKey) {
        return function (e) {
          e.preventDefault();
          e.stopPropagation();
          navigateToPage(baseUrl, locationId, pageKey);
        };
      })(item.page));
      li.appendChild(link);
      list.appendChild(li);
    }

    container.appendChild(list);

    var insertAfter = findCleanQuoteSidebarRow();
    if (insertAfter && insertAfter.parentNode) {
      var next = insertAfter.nextElementSibling;
      insertAfter.parentNode.insertBefore(container, next);
      return;
    }

    var sidebarSelectors = [
      '[data-testid="sidebar"]',
      '[class*="sidebar"]',
      'aside',
      'nav[aria-label*="ain"]',
      '.sidebar',
      '#sidebar',
    ];

    var parent = null;
    for (var s = 0; s < sidebarSelectors.length; s++) {
      var el = document.querySelector(sidebarSelectors[s]);
      if (el && el.contains && !el.querySelector('#' + CONTAINER_ID)) {
        parent = el;
        break;
      }
    }

    if (!parent) {
      parent = document.querySelector('main') || document.body;
    }

    if (parent) {
      parent.appendChild(container);
    }
  }

  function run() {
    var baseUrl = getBaseUrl();

    function tryInject(locationId) {
      if (!locationId || locationId.length < 10) return;
      injectSidebarMenu(locationId, baseUrl);
    }

    if (typeof window !== 'undefined' && window.AppUtils && window.AppUtils.Utilities && typeof window.AppUtils.Utilities.getCurrentLocation === 'function') {
      window.AppUtils.Utilities.getCurrentLocation()
        .then(function (loc) {
          if (loc && loc.id) tryInject(loc.id);
          else tryInject(getLocationIdFromUrl());
        })
        .catch(function () {
          tryInject(getLocationIdFromUrl());
        });
    } else {
      tryInject(getLocationIdFromUrl());
    }
  }

  function waitAndRun() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(run, 1500);
      });
    } else {
      setTimeout(run, 500);
    }
    window.addEventListener('routeLoaded', function () {
      setTimeout(run, 300);
    });
    window.addEventListener('routeChangeEvent', function () {
      setTimeout(run, 300);
    });
  }

  waitAndRun();
})();
