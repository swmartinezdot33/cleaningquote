/**
 * CleanQuote.io GHL Agency Master Script
 * @version 2026-02-14-submenu-purple (active submenu: lighter bg, purple text, sharp corners)
 * One script: favicon, Sub-Accounts move, HighLevel/SaaS groups, and CleanQuote sidebar menu.
 * Native GHL dashboard/sidebar is left alone (no redirect, no reposition, no hijack).
 * Config: window.CLEANQUOTE_AGENCY_CONFIG (optional). Query params on script src override (e.g. ?customPageId=xxx&cleanquoteAppBase=...).
 * One-line install: <script src="https://www.cleanquote.io/api/script/ghl-agency-master.js?customPageId=6983df14aa911f4d3067493d"></script>
 * Cache tip: add ?v=2 (or any number) to the script URL in GHL to force reload after updates.
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
  var moveLabel = C.moveLabel || 'CleanQuote.io';
  var targetLabel = C.targetLabel || 'Conversations';
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
    return el.closest('li') || el.closest('[role="listitem"]') || el.closest('.nav-item') || el.closest('.menu-item') || el.closest('.sidebar-item') || el.closest('[role="treeitem"]') || el.closest('div[class*="nav"]') || el;
  }
  function getFirstElementChild(el) {
    if (!el) return null;
    if (el.firstElementChild) return el.firstElementChild;
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) return n;
    return null;
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
    var activeBg = 'rgba(0,0,0,0.12)';
    var activeColor = '#7c3aed';
    (function injectActiveStyles() {
      if (document.getElementById('cleanquote-ghl-sidebar-active-styles')) return;
      var style = document.createElement('style');
      style.id = 'cleanquote-ghl-sidebar-active-styles';
      style.textContent = '#' + CONTAINER_ID + ' [data-cq-active="1"] { background-color: ' + activeBg + ' !important; color: ' + activeColor + ' !important; font-weight: 600 !important; border-radius: 0 !important; }';
      (document.head || document.documentElement).appendChild(style);
    })();
    /* Submenu only: Inbox, Contacts, etc. The CleanQuote.io custom link (above this) is the dashboard. */
    var MENU_ITEMS = [
      { page: 'inbox', label: 'Inbox' },
      { page: 'contacts', label: 'Contacts' },
      { page: 'leads', label: 'Leads' },
      { page: 'quotes', label: 'Quotes' },
      { page: 'tools', label: 'Tools' },
      { page: 'service-areas', label: 'Service Areas' },
      { page: 'pricing', label: 'Pricing' }
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
    /** Update which submenu item is shown as active (iframe posts CLEANQUOTE_PAGE_CHANGED). Use setProperty(..., 'important') so GHL sidebar CSS does not override. */
    function setActiveSubmenuPage(pageKey) {
      var container = document.getElementById(CONTAINER_ID);
      if (!container) return;
      var key = (pageKey || '').toString().trim().toLowerCase();
      var buttons = container.querySelectorAll('[data-cq-page]');
      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        var page = (btn.getAttribute('data-cq-page') || '').toLowerCase();
        var isActive = page === key;
        btn.setAttribute('data-cq-active', isActive ? '1' : '0');
        if (isActive) {
          btn.style.setProperty('background-color', activeBg, 'important');
          btn.style.setProperty('color', activeColor, 'important');
          btn.style.fontWeight = '600';
        } else {
          btn.style.removeProperty('background-color');
          btn.style.removeProperty('color');
          btn.style.fontWeight = '';
        }
      }
    }
    function getActivePageFromParentUrl() {
      try {
        var q = (window.location && window.location.search) || '';
        var match = q.match(/[?&]cleanquote-page=([^&]+)/);
        return match ? decodeURIComponent(match[1]).trim().toLowerCase() : '';
      } catch (e) { return ''; }
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
    /** Find the Dashboard link element (not the row) for safe single-item hide. */
    function findDashboardLink() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (text === 'dashboard') return el;
      }
      return null;
    }
    /** Hide only the native Dashboard menu item (smallest wrapper), not a large container. */
    function hideDashboardItem() {
      var link = findDashboardLink();
      if (!link) return;
      var row = link.parentElement;
      if (row && row.id !== CONTAINER_ID && !row.querySelector('#' + CONTAINER_ID)) {
        var childCount = 0;
        for (var j = 0; j < row.children.length; j++) { if (row.children[j].nodeType === 1) childCount++; }
        if (childCount === 1) {
          row.style.display = 'none';
          row.setAttribute('data-cleanquote-hidden-dashboard', '1');
          return;
        }
      }
      link.style.display = 'none';
      link.setAttribute('data-cleanquote-hidden-dashboard', '1');
    }
    /** First nav row (Home, Launchpad, Dashboard, etc.). Pass excludeRow to skip our app row. */
    function findFirstNavAnchorRow(excludeRow) {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      var firstNavLabels = ['home', 'launchpad', 'dashboard', 'conversations', 'leads'];
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var row = getRow(el);
        if (!row || (row.getAttribute && row.getAttribute('data-cleanquote-hidden-dashboard') === '1')) continue;
        if (excludeRow && row === excludeRow) continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        for (var j = 0; j < firstNavLabels.length; j++) {
          if (text === firstNavLabels[j]) return row;
        }
      }
      return null;
    }
    /** First direct row-like child of the sidebar (so we can insert CleanQuote at the very top if anchor by label fails). */
    function findFirstSidebarInsertPoint() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var first = root.firstElementChild;
      while (first && first.id === CONTAINER_ID) first = first.nextElementSibling;
      return first || null;
    }
    /** Find the sidebar row that contains a link with the given label (e.g. "Conversations"). */
    function findRowByLabelInSidebar(label, excludeRow) {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var wanted = normLower(label);
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var row = getRow(el);
        if (!row || (row.getAttribute && row.getAttribute('data-cleanquote-hidden-dashboard') === '1')) continue;
        if (excludeRow && row === excludeRow) continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (text === wanted) return row;
      }
      return null;
    }
    /** First visible nav row in sidebar (DOM order). */
    function findFirstSidebarNavRow() {
      var root = getLeftSidebarRoot();
      if (!root) return null;
      var candidates = root.querySelectorAll('a, [role="link"], button');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) continue;
        var row = getRow(el);
        if (!row || (row.getAttribute && row.getAttribute('data-cleanquote-hidden-dashboard') === '1')) continue;
        var text = normLower((el.textContent || '').split('\n')[0].trim());
        if (!text) continue;
        return row;
      }
      return null;
    }
    /** Find the app menu row: by label "CleanQuote.io" / "Dashboard" (same as working script) or href with custom-page-link. Exclude location switcher. */
    function findCleanQuoteCustomLinkRow() {
      function isLocationSwitcher(el) {
        var rawText = (el.textContent || '').replace(/\s+/g, ' ').trim();
        var text = normLower(rawText);
        return text.indexOf('through') !== -1 || /,\s*[a-z]{2}\s*$/.test(rawText);
      }
      function isAppRow(el) {
        if (!el || el.id === CONTAINER_ID || (el.closest && el.closest('#' + CONTAINER_ID))) return false;
        if (isLocationSwitcher(el)) return false;
        var href = (el.href || el.getAttribute('href') || '').trim().toLowerCase();
        var firstLine = normLower((el.textContent || '').split('\n')[0].trim());
        var isOurHref = href.indexOf('custom-page-link') !== -1 && (customPageId ? href.indexOf(customPageId.toLowerCase()) !== -1 : true);
        var isOurLabel = firstLine === 'cleanquote.io' || firstLine === 'cleanquote';
        if (isOurHref) return true;
        if (isOurLabel && (href.indexOf('custom-page-link') !== -1 || href.indexOf('cleanquote') !== -1)) return true;
        return false;
      }
      function rowFrom(el) {
        if (!isAppRow(el)) return null;
        var row = getRow(el);
        return (row && row.id !== CONTAINER_ID) ? row : null;
      }
      var root = getLeftSidebarRoot();
      if (root) {
        var candidates = root.querySelectorAll('a, [role="link"], button');
        for (var i = 0; i < candidates.length; i++) {
          var row = rowFrom(candidates[i]);
          if (row) return row;
        }
      }
      var byHref = document.querySelectorAll('a[href*="custom-page-link"]');
      for (var j = 0; j < byHref.length; j++) {
        var row = rowFrom(byHref[j]);
        if (row) return row;
      }
      if (customPageId) {
        var byId = document.querySelectorAll('a[href*="' + customPageId + '"]');
        for (var h = 0; h < byId.length; h++) {
          var row = rowFrom(byId[h]);
          if (row) return row;
        }
      }
      return null;
    }
    /** Move CleanQuote.io to the top: same as working script — insert custom row before the native dashboard row, then hide native dashboard. Keeps our submenu container right after the CleanQuote row. */
    function moveCleanQuoteToTopAndHideDashboard() {
      // #region agent log
      function dbg(payload) {
        var entry = { location: 'ghl-agency-master.js:moveCleanQuoteToTopAndHideDashboard', message: 'move-attempt', data: payload, timestamp: Date.now() };
        try {
          fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(function () { console.log('[CQ Sidebar Move]', entry); });
        } catch (e) { console.log('[CQ Sidebar Move]', entry); }
      }
      // #endregion
      var root = getLeftSidebarRoot();
      if (!root) {
        dbg({ hypothesisId: 'H1', rootFound: false });
        return;
      }

      var ourContainer = document.getElementById(CONTAINER_ID);
      var cleanQuoteRow = (ourContainer && ourContainer.previousElementSibling) ? ourContainer.previousElementSibling : findCleanQuoteCustomLinkRow();
      if (!cleanQuoteRow || !cleanQuoteRow.parentNode) {
        dbg({ hypothesisId: 'H2', cleanQuoteRowFound: !!cleanQuoteRow, hasParent: !!(cleanQuoteRow && cleanQuoteRow.parentNode) });
        return;
      }

      var sidebarNav = document.querySelector('.hl_navbar--nav-items');
      if (sidebarNav && cleanQuoteRow && sidebarNav !== cleanQuoteRow.parentNode) {
        try {
          sidebarNav.prepend(cleanQuoteRow);
          if (ourContainer && cleanQuoteRow.nextElementSibling !== ourContainer) {
            sidebarNav.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
          }
          dbg({ hypothesisId: 'H_prepend', didPrepend: true });
        } catch (e) {
          dbg({ hypothesisId: 'H_prepend_err', error: (e && e.message) || String(e) });
        }
      } else if (sidebarNav && cleanQuoteRow.parentNode === sidebarNav && cleanQuoteRow.previousElementSibling) {
        try {
          sidebarNav.prepend(cleanQuoteRow);
          if (ourContainer && cleanQuoteRow.nextElementSibling !== ourContainer) {
            sidebarNav.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
          }
          dbg({ hypothesisId: 'H_prepend_same', didPrepend: true });
        } catch (e) {}
      } else {
        var parent = cleanQuoteRow.parentNode;
        if (parent && cleanQuoteRow.previousElementSibling) {
          try {
            parent.prepend(cleanQuoteRow);
            if (ourContainer && cleanQuoteRow.nextElementSibling !== ourContainer) {
              parent.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
            }
            dbg({ hypothesisId: 'H_prepend_parent', didPrepend: true });
          } catch (e) {}
        } else {
          /* Prefer: insert CleanQuote.io above Conversations; else before first nav (Home, Launchpad, Dashboard, etc.). */
          var anchorRow = findRowByLabelInSidebar('Conversations', cleanQuoteRow) || findFirstNavAnchorRow(cleanQuoteRow);
          if (anchorRow && anchorRow.parentNode && anchorRow !== cleanQuoteRow) {
            try {
              anchorRow.parentNode.insertBefore(cleanQuoteRow, anchorRow);
              dbg({ hypothesisId: 'H_move_top', didInsertBeforeAnchor: true });
            } catch (e) {
              dbg({ hypothesisId: 'H5', didInsert: false, error: (e && e.message) || String(e) });
            }
          }
          if (ourContainer && cleanQuoteRow.parentNode && cleanQuoteRow.nextElementSibling !== ourContainer) {
            try {
              cleanQuoteRow.parentNode.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
              dbg({ hypothesisId: 'H_container', didMoveContainer: true });
            } catch (e) {}
          }
        }
      }

      /* Always keep submenu attached to CleanQuote.io: ensure container is immediately after the row (handles retries and other scripts moving the row). */
      if (ourContainer && cleanQuoteRow.parentNode && cleanQuoteRow.nextElementSibling !== ourContainer) {
        try {
          cleanQuoteRow.parentNode.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
        } catch (e) {}
      }

      hideDashboardItem();
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
      var itemStyle = 'display:block;width:100%;text-align:left;background:transparent;border:none;border-radius:0;cursor:pointer;padding:8px 12px;padding-left:24px;font-size:14px;color:inherit;font-family:inherit;';
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
        link.addEventListener('mouseleave', function () {
          var isActive = this.getAttribute('data-cq-active') === '1';
          if (isActive) {
            this.style.setProperty('background-color', activeBg, 'important');
            this.style.setProperty('color', activeColor, 'important');
          } else {
            this.style.removeProperty('background-color');
            this.style.removeProperty('color');
          }
        });
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
      /* Insert our submenu right after the CleanQuote.io link so order is: native GHL items → CleanQuote.io → our submenu (Inbox, etc.). */
      var cleanQuoteRow = findCleanQuoteCustomLinkRow();
      if (cleanQuoteRow && cleanQuoteRow.parentNode) {
        var next = cleanQuoteRow.nextSibling;
        if (next) cleanQuoteRow.parentNode.insertBefore(container, next);
        else cleanQuoteRow.parentNode.appendChild(container);
      } else {
        var dashboardRow = findDashboardRow();
        var beforeEl = dashboardRow || findFirstSidebarNavRow();
        if (beforeEl && beforeEl.parentNode)
          beforeEl.parentNode.insertBefore(container, beforeEl);
        else
          leftSidebar.appendChild(container);
      }
      moveCleanQuoteToTopAndHideDashboard();
      setActiveSubmenuPage(getActivePageFromParentUrl());
    }
    window.addEventListener('message', function (event) {
      var data = event.data && typeof event.data === 'object' ? event.data : null;
      if (data && data.type === 'CLEANQUOTE_PAGE_CHANGED' && typeof data.page === 'string')
        setActiveSubmenuPage(data.page);
    });
    function run() {
      function tryInject(locId) {
        if (!locId || locId.length < 10) return;
        injectSidebarMenu(locId);
        if (document.getElementById(CONTAINER_ID))
          setActiveSubmenuPage(getActivePageFromParentUrl());
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
    var moveRetries = [800, 1500, 3000, 5000, 7000, 10000, 15000, 20000];
    moveRetries.forEach(function (delay) { setTimeout(moveCleanQuoteToTopAndHideDashboard, delay); });
    /* Re-run move when sidebar DOM changes (e.g. after customizer), same concept as config-driven "location: top". Debounce to avoid loops. */
    var moveDebounce = 0;
    function scheduleMove() {
      if (moveDebounce) return;
      moveDebounce = setTimeout(function () { moveDebounce = 0; moveCleanQuoteToTopAndHideDashboard(); }, 800);
    }
    try {
      var root = getLeftSidebarRoot();
      if (root && typeof MutationObserver !== 'undefined') {
        var mo = new MutationObserver(function () { scheduleMove(); });
        mo.observe(root, { childList: true, subtree: true });
      }
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
      pricing: 'Pricing'
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
