/**
 * GHL console test – paste into browser console on a GHL page to test without deploying.
 * Copy ONE block at a time (do not run the whole file).
 */

// ========== 1) Move selected element to first (use with $0) ==========
// In Elements: right-click the CleanQuote nav row → Inspect. Then run this block.
// In DevTools: right-click the CleanQuote nav row → Inspect → in console run:
(function () {
  const selectedElement = $0;  // use the element you selected in Elements
  const parentElement = selectedElement && selectedElement.parentElement;
  if (parentElement) {
    parentElement.prepend(selectedElement);
    console.log('Moved', selectedElement, 'to first');
  } else {
    console.warn('Select the nav row in Elements first, then run this');
  }
})();

// ========== 2) Find CleanQuote row and move to first (no $0) ==========
(function () {
  var customPageId = (window.CLEANQUOTE_AGENCY_CONFIG && window.CLEANQUOTE_AGENCY_CONFIG.customPageId) || '6983df14aa911f4d3067493d';
  function normLower(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function getRow(el) {
    if (!el) return null;
    return el.closest('li') || el.closest('[role="listitem"]') || el.closest('.nav-item') || el.closest('.menu-item') || el.closest('div[class*="nav"]') || el;
  }
  function getLeftSidebarRoot() {
    var asides = document.querySelectorAll('aside');
    for (var i = 0; i < asides.length; i++) {
      var links = asides[i].querySelectorAll('a, [role="link"], button');
      for (var j = 0; j < links.length; j++) {
        var href = (links[j].href || '').toLowerCase();
        if (href.indexOf('custom-page-link') !== -1) return asides[i];
      }
    }
    return document.querySelector('#sidebar-v2') || document.querySelector('aside') || document.querySelector('nav') || null;
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
      if (href.indexOf('custom-page-link') !== -1 && (href.indexOf(customPageId) !== -1 || text.indexOf('cleanquote') !== -1)) {
        return getRow(el);
      }
    }
    return null;
  }
  var selectedElement = findCleanQuoteCustomLinkRow();
  if (!selectedElement) { console.warn('CleanQuote nav row not found'); return; }
  var parentElement = selectedElement.parentElement;
  if (parentElement) {
    parentElement.prepend(selectedElement);
    console.log('Moved CleanQuote row to first');
  }
  var container = document.getElementById('cleanquote-ghl-sidebar-menu');
  if (container && parentElement && selectedElement.nextElementSibling !== container) {
    parentElement.insertBefore(container, selectedElement.nextSibling);
    console.log('Re-inserted submenu after CleanQuote row');
  }
})();

// ========== 3) Move with Promise (same as your snippet) ==========
// Use $0: select the row in Elements, then run:
new Promise(function (resolve) {
  var selectedElement = $0;
  var parentElement = selectedElement && selectedElement.parentElement;
  if (parentElement) {
    parentElement.prepend(selectedElement);
  }
  resolve();
}).then(function () { console.log('Done'); });
