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

/** FIXED: Move CleanQuote to absolute top of sidebar */
function moveCleanQuoteToTopAndHideDashboard() {
var root = getLeftSidebarRoot();
if (!root) return;

var ourContainer = document.getElementById(CONTAINER_ID);
var cleanQuoteRow = (ourContainer && ourContainer.previousElementSibling) ? ourContainer.previousElementSibling : findCleanQuoteCustomLinkRow();

// Target the GHL navigation container
var sidebarNav = document.querySelector('.hl_navbar--nav-items') || root.querySelector('ul') || root;

if (cleanQuoteRow && sidebarNav) {
  // Ensure it is the first child
  if (sidebarNav.firstChild !== cleanQuoteRow) {
    sidebarNav.prepend(cleanQuoteRow);
  }

  // Keep sub-menu container attached immediately below it
  if (ourContainer && cleanQuoteRow.nextElementSibling !== ourContainer) {
    cleanQuoteRow.parentNode.insertBefore(ourContainer, cleanQuoteRow.nextSibling);
  }
  cleanQuoteRow.setAttribute('data-cleanquote-primary', '1');
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
  btn.textConte