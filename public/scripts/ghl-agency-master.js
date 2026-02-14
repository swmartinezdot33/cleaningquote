/**
 * CleanQuote.io GHL Agency Master Script
 * One script: favicon, Sub-Accounts move, HighLevel/SaaS groups, and CleanQuote sidebar menu.
 * Native GHL dashboard/sidebar is left alone (no redirect, no reposition, no hijack).
 * Config: window.CLEANQUOTE_AGENCY_CONFIG (optional). Query params on script src override (e.g. ?customPageId=xxx&cleanquoteAppBase=...).
 * One-line install: <script src="https://www.cleanquote.io/api/script/ghl-agency-master.js?customPageId=6983df14aa911f4d3067493d"></script>
 */
(function () {
  'use strict';
  var C = (typeof window !== 'undefined' && window.CLEANQUOTE_AGENCY_CONFIG) || {};
  (function () {
    var script = document.currentScript;
    if (!script && typeof document !== 'undefined') {
      var list = document.querySelectorAll('script[src*="ghl-agency-master"]');
      script = list.length ? list[list.length - 1] : null;
    }
    if (script && script.src) {
      try {
        var u = new URL(script.src);
        var q = u.searchParams;
        if (q.get('customPageId')) C.customPageId = q.get('customPageId');
        if (q.get('faviconUrl')) C.faviconUrl = q.get('faviconUrl');
        if (q.get('cleanquoteAppBase')) C.cleanquoteAppBase = q.get('cleanquoteAppBase');
        if (q.get('baseUrl')) C.baseUrl = q.get('baseUrl');
        if (q.get('moveLabel')) C.moveLabel = q.get('moveLabel');
        if (q.get('targetLabel')) C.targetLabel = q.get('targetLabel');
      } catch (e) {}
    }
  })();
  var customPageId = C.customPageId || '6983df14aa911f4d3067493d';
  var faviconUrl = C.faviconUrl || 'https://www.cleanquote.io/icon.svg';
  var moveLabel = C.moveLabel || 'Sub-Accounts';
  var targetLabel = C.targetLabel || 'SaaS';
  var cleanquoteAppBase = (C.cleanquoteAppBase || C.baseUrl || 'https://my.cleanquote.io').replace(/\/+$/, '');
  var groups = C.groups || [
    { parentLabel: 'HighLevel', labels: ['Add-Ons', 'Template Library', 'Partners', 'University', 'SaaS Education', 'GHL Swag', 'Ideas'] },
    { parentLabel: 'SaaS', labels: ['Prospecting', 'Account Snapshots', 'Reselling', 'SaaS Configurator', 'Affiliate Portal', 'App Marketplace', 'Mobile App'] }
  ];

  function getOrigin() {
    if (typeof window === 'undefined' || !window.location) return '';
    return window.location.origin || (window.location.protocol + '//' + window.location.host);
  }
  function buildCustomPageUrl(locationId) {
    var o = getOrigin();
    return o ? o + '/v2/location/' + encodeURIComponent(locationId) + '/custom-page-link/' + encodeURIComponent(customPageId) : null;
  }
  function getLocationIdFromUrl() {
    try {
      var href = typeof window !== 'undefined' && window.location ? window.location.href : '';
      if (!href) return '';
      var m = href.match(/\/(?:v2\/)?(?:location|oauth)\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
      if (m && m[1]) return m[1];
      var hash = typeof window !== 'undefined' && window.location && window.location.hash ? window.location.hash : '';
      if (hash) {
        m = hash.match(/\/v2\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
        if (m && m[1]) return m[1];
        m = hash.match(/\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
        if (m && m[1]) return m[1];
      }
      var qs = typeof window !== 'undefined' && window.location && window.location.search ? window.location.search : '';
      m = qs.match(/[?&]locationId=([a-zA-Z0-9\-]{16,50})(?:&|$)/);
      if (m && m[1]) return m[1];
      m = qs.match(/[?&]location_id=([a-zA-Z0-9\-]{16,50})(?:&|$)/);
      if (m && m[1]) return m[1];
      if (typeof window !== 'undefined' && (window.__GHL_LOCATION_ID__ || window.ghlLocationId))
        return String(window.__GHL_LOCATION_ID__ || window.ghlLocationId || '').trim();
    } catch (e) {}
    return '';
  }
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function normLower(s) { return norm(s).toLowerCase(); }
  function getRow(el) {
    if (!el) return null;
    return el.closest('li') || el.closest('[role="listitem"]') || el.closest('.nav-item') || el.closest('.menu-item') || el.closest('.sidebar-item') || el;
  }
  function getLeftSidebarRoot() {
    var asides = document.querySelectorAll('aside');
    for (var i = 0; i < asides.length; i++) {
      var links = asides[i].querySelectorAll('a, [role="link"], button');
      for (var j = 0; j < links.length; j++) {
        var t = normLower(links[j].textContent || '');
        if (t === 'dashboard' || t === 'contacts' || t === 'conversations') return asides[i];
      }
    }
    var navs = document.querySelectorAll('nav');
    for (var k = 0; k < navs.length; k++) {
      var nl = navs[k].querySelectorAll('a, [role="link"], button');
      for (var m = 0; m < nl.length; m++) {
        var t2 = normLower(nl[m].textContent || '');
        if (t2 === 'dashboard' || t2 === 'contacts' || t2 === 'conversations') return navs[k];
      }
    }
    return document.querySelector('aside') || document.querySelector('nav') || null;
  }

  (function () {
    var fav = faviconUrl;
    if (!fav) return;
    function setFavicon() {
      if (!document.head) return;
      document.querySelectorAll("link[rel*='icon']").forEach(function (e) { e.remove(); });
      var isSvg = /\.svg$/i.test(fav);
      var mime = isSvg ? 'image/svg+xml' : 'image/png';
      ['icon', 'shortcut icon', 'apple-touch-icon'].forEach(function (rel) {
        var l = document.createElement('link');
        l.rel = rel;
        l.href = fav;
        l.type = mime;
        if (isSvg) l.setAttribute('sizes', 'any');
        document.head.appendChild(l);
      });
    }
    function run() {
      setFavicon();
      if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setFavicon);
      var t = 0;
      var iv = setInterval(function () { setFavicon(); if (++t >= 12) clearInterval(iv); }, 500);
      if (document.head) {
        var mo = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var nodes = mutations[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
              var n = nodes[j];
              if (n.nodeType === 1 && n.tagName === 'LINK' && (n.getAttribute('rel') || '').toLowerCase().indexOf('icon') !== -1 && n.getAttribute('href') !== fav) {
                setFavicon();
                return;
              }
            }
          }
        });
        mo.observe(document.head, { childList: true, subtree: true });
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  })();

  (function () {
    if (/\/v2\/location\//i.test(window.location.pathname)) return;
    function findRowByLabel(root, label) {
      var wanted = normLower(label);
      var gh = root.querySelector('[data-cq-group="' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(label) : label) + '"]');
      if (gh) return gh;
      var cand = Array.from(root.querySelectorAll("a, [role='link'], button, div, span")).filter(function (el) { return normLower(el.textContent) === wanted; });
      for (var i = 0; i < cand.length; i++) {
        var row = getRow(cand[i]);
        if (row) return row;
      }
      return null;
    }
    function apply() {
      var root = getLeftSidebarRoot() || document.body;
      var moveRow = findRowByLabel(root, moveLabel);
      var targetRow = findRowByLabel(root, targetLabel);
      if (!moveRow || !targetRow || moveRow.dataset.cqMovedAboveSaaS === '1') return;
      var parent = targetRow.parentNode;
      if (!parent) return;
      parent.insertBefore(moveRow, targetRow);
      moveRow.dataset.cqMovedAboveSaaS = '1';
    }
    apply();
    var mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
  })();

  (function () {
    if (/\/v2\/location\//i.test(window.location.pathname)) return;
    function getSidebarLinks(root) {
      return Array.from(root.querySelectorAll("a, [role='link'], button")).filter(function (el) { return norm(el.textContent).length > 0; });
    }
    function buildGroupRow(parentLabel, sampleRow) {
      var tag = sampleRow && sampleRow.tagName ? sampleRow.tagName.toLowerCase() : 'div';
      var wrapper = document.createElement(tag === 'li' ? 'li' : 'div');
      wrapper.className = sampleRow && sampleRow.className ? sampleRow.className : '';
      wrapper.style.cursor = 'pointer';
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.gap = '8px';
      header.style.width = '100%';
      var title = document.createElement('span');
      title.textContent = parentLabel;
      var caret = document.createElement('span');
      caret.textContent = '\u25B8';
      caret.style.opacity = '0.7';
      header.appendChild(title);
      header.appendChild(caret);
      var submenu = document.createElement('div');
      submenu.style.display = 'none';
      submenu.style.marginTop = '6px';
      submenu.style.paddingLeft = '14px';
      header.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = submenu.style.display !== 'none';
        submenu.style.display = open ? 'none' : 'block';
        caret.textContent = open ? '\u25B8' : '\u25BE';
      });
      wrapper.appendChild(header);
      wrapper.appendChild(submenu);
      wrapper.dataset.cqGroup = parentLabel;
      return { wrapper: wrapper, submenu: submenu };
    }
    function ensureGroupInserted(root, parentLabel, beforeRow) {
      var ex = root.querySelector('[data-cq-group="' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(parentLabel) : parentLabel) + '"]');
      if (ex) return { wrapper: ex, submenu: ex.querySelector('div:last-child') };
      var built = buildGroupRow(parentLabel, beforeRow);
      if (!beforeRow.parentNode) return null;
      beforeRow.parentNode.insertBefore(built.wrapper, beforeRow);
      return built;
    }
    function apply() {
      var root = getLeftSidebarRoot() || document.body;
      var links = getSidebarLinks(root);
      var byLabel = {};
      links.forEach(function (el) {
        var lbl = norm(el.textContent);
        if (!byLabel[lbl]) byLabel[lbl] = [];
        byLabel[lbl].push(el);
      });
      groups.forEach(function (group) {
        var matches = [];
        group.labels.forEach(function (lbl) {
          var els = byLabel[lbl];
          if (!els || !els.length) return;
          var el = els[0];
          var row = getRow(el);
          if (!row || row.dataset.cqMovedTo === group.parentLabel) return;
          matches.push({ lbl: lbl, row: row });
        });
        if (!matches.length) return;
        var firstRow = matches[0].row;
        var built = ensureGroupInserted(root, group.parentLabel, firstRow);
        if (!built) return;
        group.labels.forEach(function (lbl) {
          var hit = matches.find(function (m) { return m.lbl === lbl; });
          if (!hit) return;
          built.submenu.appendChild(hit.row);
          hit.row.dataset.cqMovedTo = group.parentLabel;
          hit.row.style.marginTop = '2px';
        });
      });
    }
    apply();
    var mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
  })();

  (function () {
    var CONTAINER_ID = 'cleanquote-ghl-sidebar-menu';
    /* Submenu only: Inbox, Contacts, etc. The CleanQuote.io custom link (above this) is the dashboard. */
    var MENU_ITEMS = [
      { page: 'inbox', label: 'Inbox' },
      { page: 'contacts', label: 'Contacts' },
      { page: 'leads', label: 'Leads' },
      { page: 'quotes', label: 'Quotes' },
      { page: 'tools', label: 'Tools' },
      { page: 'service-areas', label: 'Service Areas' },
      { page: 'pricing', label: 'Pricing' },
      { page: 'settings', label: 'Settings' }
    ];
    function findCleanQuoteIframe() {
      try {
        var iframes = document.querySelectorAll('iframe[src*="cleanquote"]');
        for (var i = 0; i < iframes.length; i++)
          if (iframes[i].src && iframes[i].src.indexOf('cleanquote') !== -1) return iframes[i];
      } catch (e) {}
      return null;
    }
    /** True when the CleanQuote custom page is already loaded (our iframe is in the main content). */
    function isCurrentPageCustomPageLink() {
      return !!findCleanQuoteIframe();
    }
    /** True when the current URL is the custom page link (so we can treat active "Dashboard" as our link). */
    function isOnCustomPageUrl() {
      var href = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : '';
      return href.indexOf(customPageId) !== -1 && href.indexOf('custom-page-link') !== -1;
    }
    function isActiveNav(el) {
      if (!el) return false;
      var a = el.getAttribute && el.getAttribute('aria-current');
      if (a && a !== 'false') return true;
      var cls = (el.className || '').toString();
      if (/active|router-link-active|is-active|selected|current/i.test(cls)) return true;
      var p = el.closest && el.closest('.active, .router-link-active, .is-active, .selected, [aria-current]');
      return !!p;
    }
    /** All sidebar clickables whose label is "dashboard" (for two-dashboard relocation logic). */
    function findAllDashboardElements() {
      var root = getLeftSidebarRoot();
      if (!root) return [];
      var out = [];
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (text === 'dashboard') {
          var row = getRow(el);
          if (row) out.push({ el: el, row: row });
        }
      }
      return out;
    }
    function forceNavigateToCustomPage(el) {
      if (!el || el.getAttribute('data-cq-forced-nav') === '1') return;
      var locId = getLocationIdFromUrl();
      if (!locId) return;
      var url = buildCustomPageUrl(locId);
      if (!url) return;
      if (el.tagName && el.tagName.toLowerCase() === 'a') {
        el.setAttribute('href', url);
        el.setAttribute('target', '_self');
      }
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { (window.top || window).location.href = url; } catch (err) { window.location.href = url; }
      }, true);
      el.setAttribute('data-cq-forced-nav', '1');
    }
    function navigateToPage(locationId, pageKey) {
      var url = cleanquoteAppBase + '/v2/location/' + encodeURIComponent(locationId) + '/custom-page-link/' + encodeURIComponent(customPageId) + '?cleanquote-page=' + encodeURIComponent(pageKey);
      try {
        (window.top || window).location.href = url;
      } catch (e) {
        window.location.href = url;
      }
    }
    /** Tell the iframe to switch page in-app (no parent refresh). */
    function sendPageSwitchToIframe(pageKey) {
      var iframe = findCleanQuoteIframe();
      if (!iframe || !iframe.contentWindow) return;
      try {
        var origin = (iframe.src && iframe.src.indexOf('http') === 0) ? (function () { try { return new URL(iframe.src).origin; } catch (e) { return '*'; } })() : '*';
        iframe.contentWindow.postMessage({ type: 'CLEANQUOTE_SWITCH_PAGE', page: pageKey }, origin);
      } catch (e) {}
    }
    function findDashboardRow() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (text === 'dashboard') {
          var row = getRow(el);
          if (row) return row;
        }
      }
      return null;
    }
    /** First visible nav item in sidebar (Launchpad or Dashboard) so we can insert CleanQuote above it. */
    function findFirstSidebarNavRow() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var row = getRow(el);
        if (row && row.getAttribute && row.getAttribute('data-cleanquote-hidden-dashboard') === '1') continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (text === 'launchpad' || text === 'dashboard' || text === 'conversations') {
          if (row) return row;
        }
      }
      return null;
    }
    /** Find the GHL "CleanQuote.io" custom menu link row (by label or href). Primary way to find the item to move. */
    function findCleanQuoteCustomLinkRow() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var href = (el.href || el.getAttribute('href') || '').trim().toLowerCase();
        var rawText = (el.textContent || '').split('\n')[0].trim();
        var text = normLower(rawText);
        var isCleanQuote = text.indexOf('cleanquote') !== -1 || href.indexOf('cleanquote') !== -1 || href.indexOf('custom-page-link') !== -1;
        if (isCleanQuote) {
          var row = getRow(el);
          if (row && row.id !== CONTAINER_ID) return row;
        }
      }
      return null;
    }
    /** Move the "CleanQuote.io" custom menu item right above our Inbox submenu; hide native Dashboard. */
    function moveCleanQuoteToTopAndHideDashboard() {
      var root = getLeftSidebarRoot();
      if (!root) return;

      var dashboardRow = findDashboardRow();
      if (dashboardRow && dashboardRow.style) {
        dashboardRow.style.display = 'none';
        dashboardRow.setAttribute('data-cleanquote-hidden-dashboard', '1');
      }

      var cleanQuoteRow = findCleanQuoteCustomLinkRow();
      if (!cleanQuoteRow || !cleanQuoteRow.parentNode) return;

      var ourContainer = document.getElementById(CONTAINER_ID);
      var insertBefore = ourContainer || findFirstSidebarNavRow();
      if (!insertBefore || !insertBefore.parentNode || cleanQuoteRow === insertBefore) return;
      try {
        insertBefore.parentNode.insertBefore(cleanQuoteRow, insertBefore);
      } catch (e) {}
    }
    function injectSidebarMenu(locationId) {
      if (document.getElementById(CONTAINER_ID)) return;
      var leftSidebar = getLeftSidebarRoot();
      if (!leftSidebar) return;
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
        link.addEventListener('mouseenter', function () { this.style.backgroundColor = hoverBg; });
        link.addEventListener('mouseleave', function () { this.style.backgroundColor = 'transparent'; });
        link.addEventListener('click', (function (locId, pk) {
          return function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (isCurrentPageCustomPageLink()) {
              sendPageSwitchToIframe(pk);
            } else {
              navigateToPage(locId, pk);
            }
          };
        })(locationId, item.page));
        li.appendChild(link);
        list.appendChild(li);
      }
      container.appendChild(list);
      var dashboardRow = findDashboardRow();
      var beforeEl = dashboardRow || findFirstSidebarNavRow();
      if (beforeEl && beforeEl.parentNode)
        beforeEl.parentNode.insertBefore(container, beforeEl);
      else
        leftSidebar.appendChild(container);
      moveCleanQuoteToTopAndHideDashboard();
    }
    function run() {
      function tryInject(locId) {
        if (!locId || locId.length < 10) return;
        injectSidebarMenu(locId);
      }
      if (typeof window !== 'undefined' && window.AppUtils && window.AppUtils.Utilities && typeof window.AppUtils.Utilities.getCurrentLocation === 'function') {
        window.AppUtils.Utilities.getCurrentLocation()
          .then(function (loc) { tryInject(loc && loc.id ? loc.id : getLocationIdFromUrl()); })
          .catch(function () { tryInject(getLocationIdFromUrl()); });
      } else {
        tryInject(getLocationIdFromUrl());
      }
      moveCleanQuoteToTopAndHideDashboard();
    }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 1500); });
    else
      setTimeout(run, 500);
    window.addEventListener('routeLoaded', function () { setTimeout(run, 300); });
    window.addEventListener('routeChangeEvent', function () { setTimeout(run, 300); });
    /* Re-run move when DOM changes so we catch CleanQuote link when GHL adds it later. */
    var moveRetries = [800, 1500, 3000, 5000];
    moveRetries.forEach(function (delay) { setTimeout(moveCleanQuoteToTopAndHideDashboard, delay); });
    try {
      var mo = new MutationObserver(function () { moveCleanQuoteToTopAndHideDashboard(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  })();

  /* Logo swap: only when location is on Google Sheet allowlist; logo from GHL business.logoUrl */
  (function () {
    var apiBase = (C.cleanquoteAppBase && C.cleanquoteAppBase.indexOf('cleanquote') !== -1)
      ? C.cleanquoteAppBase.replace(/^https?:\/\/(my\.)?/, 'https://www.') : 'https://www.cleanquote.io';
    apiBase = (apiBase || '').replace(/\/+$/, '') || 'https://www.cleanquote.io';
    var LOGO_SWAP_CLASS = 'cq-logo-swap-active';
    function getLocId() {
      var locId = getLocationIdFromUrl();
      if (locId) return locId;
      var sidebarLink = document.querySelector('a[href*="/v2/location/"][href*="/"]');
      if (sidebarLink && sidebarLink.href) {
        var mat = sidebarLink.href.match(/\/v2\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
        if (mat && mat[1]) return mat[1];
      }
      try {
        var path = (window.location && window.location.pathname) || '';
        mat = path.match(/\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$)/);
        if (mat && mat[1]) return mat[1];
        var hash = (window.location && window.location.hash) || '';
        if (hash) {
          mat = hash.match(/\/v2\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
          if (mat && mat[1]) return mat[1];
          mat = hash.match(/\/location\/([a-zA-Z0-9\-]{16,50})(?:\/|$|\?)/);
          if (mat && mat[1]) return mat[1];
        }
      } catch (e) {}
      return '';
    }
    function run() {
      var locId = getLocId();
      document.documentElement.classList.remove(LOGO_SWAP_CLASS);
      if (!locId) return;
      fetch(apiBase + '/api/ghl/logo-swap-config?locationId=' + encodeURIComponent(locId), { method: 'GET' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.applyLogoSwap === true) {
            document.documentElement.classList.add(LOGO_SWAP_CLASS);
            if (data.logoUrl && typeof data.logoUrl === 'string') {
              var url = data.logoUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              document.documentElement.style.setProperty('--new-logo', 'url("' + url + '")');
            }
          }
        })
        .catch(function () {});
    }
    function scheduleRun() {
      run();
      setTimeout(run, 800);
      setTimeout(run, 2000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(scheduleRun, 300); });
    else setTimeout(scheduleRun, 300);
    window.addEventListener('routeLoaded', function () { setTimeout(scheduleRun, 400); });
    window.addEventListener('routeChangeEvent', function () { setTimeout(scheduleRun, 400); });
  })();

  /* Update title tag with current page and location so the tab reflects what you're viewing. */
  (function () {
    var PAGE_LABELS = {
      dashboard: 'Dashboard',
      inbox: 'Inbox',
      contacts: 'Contacts',
      leads: 'Leads',
      quotes: 'Quotes',
      tools: 'Tools',
      'service-areas': 'Service Areas',
      pricing: 'Pricing',
      settings: 'Settings'
    };
    function getLocationNameFromSidebar() {
      var root = getLeftSidebarRoot();
      if (!root) return '';
      var buttons = root.querySelectorAll('button, [role="button"], a');
      for (var i = 0; i < buttons.length; i++) {
        var el = buttons[i];
        if (el.id === 'cleanquote-ghl-sidebar-menu' || el.closest && el.closest('#cleanquote-ghl-sidebar-menu')) continue;
        var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (text.length > 2 && text.length < 120) {
          var lower = text.toLowerCase();
          if (lower.indexOf('dashboard') !== -1 || lower.indexOf('conversations') !== -1 || lower === 'contacts' || lower === 'leads' || lower === 'quotes') continue;
          return text;
        }
      }
      return '';
    }
    var lastCleanQuotePage = '';
    function getPageNameFromUrl() {
      var qs = (window.location && window.location.search) || '';
      var m = qs.match(/[?&]cleanquote-page=([a-zA-Z0-9_-]+)/);
      if (m && m[1]) {
        var key = m[1].toLowerCase();
        lastCleanQuotePage = key;
        var label = PAGE_LABELS[key];
        if (label) return label;
      }
      if (lastCleanQuotePage) {
        var label = PAGE_LABELS[lastCleanQuotePage];
        if (label) return label;
      }
      return '';
    }
    function getActiveNavLabel() {
      var root = getLeftSidebarRoot();
      if (!root) return '';
      var active = root.querySelector('[aria-current="page"], .active, [class*="active"]');
      if (active) {
        var text = (active.textContent || '').split('\n')[0].trim();
        if (text.length > 0 && text.length < 50) return text;
      }
      var links = root.querySelectorAll('a[href*="location"], a[href*="dashboard"], a[href*="conversations"]');
      for (var j = 0; j < links.length; j++) {
        var href = (links[j].href || '').toLowerCase();
        var path = (window.location && window.location.pathname) || '';
        if (href.indexOf(path.split('/').pop() || '') !== -1 || (path.indexOf('conversations') !== -1 && href.indexOf('conversations') !== -1)) {
          var t = (links[j].textContent || '').split('\n')[0].trim();
          if (t) return t;
        }
      }
      return '';
    }
    var TITLE_SUFFIX = ' | LaunchPad';
    function applyTitle() {
      try {
        var pageName = getPageNameFromUrl() || getActiveNavLabel();
        var locationName = getLocationNameFromSidebar();
        var parts = [];
        if (pageName) parts.push(pageName);
        if (locationName) parts.push(locationName);
        var base = parts.length ? parts.join(' | ') : '';
        if (base) {
          base = base.replace(/\s*\|\s*LaunchPad\s*$/i, '');
          document.title = base + TITLE_SUFFIX;
        } else {
          document.title = 'LaunchPad';
        }
      } catch (e) {}
    }
    function scheduleTitle() {
      applyTitle();
      setTimeout(applyTitle, 500);
      setTimeout(applyTitle, 1500);
    }
    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'CLEANQUOTE_PAGE_CHANGED' && typeof event.data.page === 'string') {
        lastCleanQuotePage = event.data.page.trim().toLowerCase();
        applyTitle();
      }
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(scheduleTitle, 400); });
    else setTimeout(scheduleTitle, 400);
    window.addEventListener('routeLoaded', function () { setTimeout(scheduleTitle, 500); });
    window.addEventListener('routeChangeEvent', function () { setTimeout(scheduleTitle, 500); });
  })();
})();
