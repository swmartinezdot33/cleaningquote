/**
 * CleanQuote.io GHL Agency Master Script
 * @version 2026-02-14-fixed-top-menu
 * One script: favicon, Sub-Accounts move, HighLevel/SaaS groups, and CleanQuote sidebar menu.
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

  /* --- Favicon Logic --- */
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
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setFavicon);
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

  /* --- Sidebar / Submenu Logic --- */
  (function () {
    var CONTAINER_ID = 'cleanquote-ghl-sidebar-menu';
    var activeBg = 'rgba(0,0,0,0.12)';
    var activeColor = '#7c3aed';
    var ourPurple = '#7c3aed';

    function setElementStyles(el, styles) {
      if (!el || !styles) return;
      for (var k in styles) {
        if (styles.hasOwnProperty(k)) {
          var cssKey = k.replace(/([A-Z])/g, function (m) { return '-' + m.toLowerCase(); });
          el.style.setProperty(cssKey, styles[k]);
        }
      }
    }

    function findCleanQuoteCustomLinkRow() {
        var root = getLeftSidebarRoot();
        if (!root) return null;
        var searchRoot = document.querySelector('.hl_navbar--nav-items') || root;
        var candidates = searchRoot.querySelectorAll('a');
        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            var href = (el.href || '').toLowerCase();
            var text = normLower(el.textContent || '');
            if (href.indexOf('custom-page-link') !== -1 && (href.indexOf(customPageId.toLowerCase()) !== -1 || text.indexOf('cleanquote') !== -1)) {
                return getRow(el);
            }
        }
        return null;
    }

    function hideDashboardItem() {
        var root = getLeftSidebarRoot();
        if (!root) return;
        var links = root.querySelectorAll('a, [role="link"]');
        for (var i = 0; i < links.length; i++) {
            var text = normLower(links[i].textContent || '');
            if (text === 'dashboard' && links[i].id !== CONTAINER_ID) {
                var row = getRow(links[i]);
                if (row) row.style.display = 'none';
            }
        }
    }

    /** Move CleanQuote to top of its parent: parent.prepend(elementToMove) */
    function moveCleanQuoteToTopAndHideDashboard() {
      var ourContainer = document.getElementById(CONTAINER_ID);
      var elementToMove = (ourContainer && ourContainer.previousElementSibling) ? ourContainer.previousElementSibling : findCleanQuoteCustomLinkRow();
      var parentElement = elementToMove && elementToMove.parentElement;

      if (elementToMove && parentElement) {
        parentElement.prepend(elementToMove);
        if (ourContainer && elementToMove.nextElementSibling !== ourContainer) {
          parentElement.insertBefore(ourContainer, elementToMove.nextSibling);
        }
        elementToMove.setAttribute('data-cleanquote-primary', '1');
        setElementStyles(elementToMove, { backgroundColor: ourPurple });
      }

      hideDashboardItem();
    }

    /* Submenu definition */
    var MENU_ITEMS = [
      { page: 'inbox', label: 'Inbox' },
      { page: 'contacts', label: 'Contacts' },
      { page: 'leads', label: 'Leads' },
      { page: 'quotes', label: 'Quotes' },
      { page: 'tools', label: 'Tools' },
      { page: 'service-areas', label: 'Service Areas' },
      { page: 'pricing', label: 'Pricing' }
    ];

    function injectSidebarMenu(locationId) {
      if (document.getElementById(CONTAINER_ID)) return;
      var leftSidebar = getLeftSidebarRoot();
      if (!leftSidebar) return;

      var container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.style.cssText = 'margin:0;padding:0;';
      var list = document.createElement('ul');
      list.style.cssText = 'list-style:none;margin:0;padding:0;';
      
      MENU_ITEMS.forEach(function(item) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.textContent = item.label;
        btn.setAttribute('data-cq-page', item.page);
        btn.style.cssText = 'display:block;width:100%;text-align:left;background:transparent;border:none;padding:8px 12px 8px 24px;font-size:14px;cursor:pointer;color:inherit;';
        
        btn.onclick = function() {
            var url = cleanquoteAppBase + '/v2/location/' + locationId + '/custom-page-link/' + customPageId + '?cleanquote-page=' + item.page;
            window.location.href = url;
        };
        li.appendChild(btn);
        list.appendChild(li);
      });

      container.appendChild(list);
      var cqRow = findCleanQuoteCustomLinkRow();
      if (cqRow && cqRow.parentNode) {
        cqRow.parentNode.insertBefore(container, cqRow.nextSibling);
      }
      
      moveCleanQuoteToTopAndHideDashboard();
    }

    // Initialization
    setTimeout(function() {
      var locId = getLocationIdFromUrl();
      if (locId) injectSidebarMenu(locId);
      moveCleanQuoteToTopAndHideDashboard();
    }, 1000);

    // Watch for DOM changes to keep it at the top
    var observer = new MutationObserver(moveCleanQuoteToTopAndHideDashboard);
    observer.observe(document.body, { childList: true, subtree: true });
  })();

  /* --- Title Management --- */
  (function () {
    function applyTitle() {
        if (window.location.href.indexOf(customPageId) !== -1) {
            document.title = "CleanQuote.io";
        }
    }
    setInterval(applyTitle, 2000);
  })();

  /* --- Avatar fallback: our purple when no image --- */
  (function () {
    var ourPurple = '#7c3aed';
    function styleAvatar() {
      var avatarImg = document.querySelector('.avatar_img');
      if (avatarImg && !avatarImg.getAttribute('src')) {
        avatarImg.style.backgroundColor = ourPurple;
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', styleAvatar);
    } else {
      styleAvatar();
    }
    setTimeout(styleAvatar, 1500);
  })();

})();