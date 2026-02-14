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
      var m = href.match(/\/(?:v2\/)?(?:location|oauth)\/([a-zA-Z0-9]{16,30})(?:\/|$|\?)/);
      if (m && m[1]) return m[1];
      var qs = typeof window !== 'undefined' && window.location && window.location.search ? window.location.search : '';
      m = qs.match(/[?&]locationId=([a-zA-Z0-9]{16,30})(?:&|$)/);
      if (m && m[1]) return m[1];
      m = qs.match(/[?&]location_id=([a-zA-Z0-9]{16,30})(?:&|$)/);
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
    var MENU_ITEMS = [
      { page: 'dashboard', label: 'Dashboard' },
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
    function navigateToPage(locationId, pageKey) {
      var url = cleanquoteAppBase + '/v2/location/' + encodeURIComponent(locationId) + '/custom-page-link/' + encodeURIComponent(customPageId) + '?cleanquote-page=' + encodeURIComponent(pageKey);
      try {
        (window.top || window).location.href = url;
      } catch (e) {
        window.location.href = url;
      }
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
        link.addEventListener('click', (function (pk) {
          return function (e) {
            e.preventDefault();
            e.stopPropagation();
            navigateToPage(locationId, pk);
          };
        })(item.page));
        li.appendChild(link);
        list.appendChild(li);
      }
      container.appendChild(list);
      var beforeEl = findDashboardRow();
      if (beforeEl && beforeEl.parentNode)
        beforeEl.parentNode.insertBefore(container, beforeEl);
      else
        leftSidebar.appendChild(container);
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
    }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 1500); });
    else
      setTimeout(run, 500);
    window.addEventListener('routeLoaded', function () { setTimeout(run, 300); });
    window.addEventListener('routeChangeEvent', function () { setTimeout(run, 300); });
  })();

  /* Logo swap: allowlist from Google Sheet, logo from GHL location business.logoUrl */
  (function () {
    var apiBase = (C.cleanquoteAppBase && C.cleanquoteAppBase.indexOf('cleanquote') !== -1)
      ? C.cleanquoteAppBase.replace(/^https?:\/\/(my\.)?/, 'https://www.') : 'https://www.cleanquote.io';
    apiBase = (apiBase || '').replace(/\/+$/, '') || 'https://www.cleanquote.io';
    function run() {
      var locId = getLocationIdFromUrl();
      if (!locId) {
        var sidebarLink = document.querySelector('a[href*="/v2/location/"][href*="/"]');
        if (sidebarLink && sidebarLink.href) {
          var mat = sidebarLink.href.match(/\/v2\/location\/([a-zA-Z0-9]{16,30})(?:\/|$|\?)/);
          if (mat && mat[1]) locId = mat[1];
        }
      }
      if (!locId) return;
      fetch(apiBase + '/api/ghl/logo-swap-config?locationId=' + encodeURIComponent(locId), { method: 'GET' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.applyLogoSwap && data.logoUrl && typeof data.logoUrl === 'string') {
            var url = data.logoUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            document.documentElement.style.setProperty('--new-logo', 'url("' + url + '")');
          }
        })
        .catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
    window.addEventListener('routeLoaded', run);
    window.addEventListener('routeChangeEvent', run);
  })();
})();
