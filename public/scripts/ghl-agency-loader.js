/**
 * GHL Agency Loader – one script loads master CSS + agency script (login + dashboard).
 *
 * In GHL: Agency → Settings → Company → Custom JavaScript (or Custom Code). Add one line:
 *   <script src="https://www.cleanquote.io/api/script/ghl-agency-loader.js"></script>
 *
 * This runs on every page where GHL injects that code (including login when that box runs there).
 * It injects:
 *   1. ghl-agency-custom-css.css (login + dashboard) – fetched and applied so it works on login
 *   2. ghl-agency-master.js (logo swap, sidebar, favicon, etc.)
 */
(function () {
  var script = document.currentScript;
  if (!script || !script.src) return;
  var origin = script.src.replace(/\/api\/script\/ghl-agency-loader\.js.*$/, '') || 'https://www.cleanquote.io';
  var cssUrl = origin + '/scripts/ghl-agency-custom-css.css';

  /* Inject <link> immediately so CSS starts loading right away */
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  link.setAttribute('data-ghl-custom', 'cleanquote');
  document.head.appendChild(link);

  /* Fetch same CSS and inject as <style> when loaded – ensures styles apply on login (no reliance on @import or async link timing) */
  fetch(cssUrl, { mode: 'cors' })
    .then(function (r) { return r.text(); })
    .then(function (css) {
      var style = document.createElement('style');
      style.setAttribute('data-ghl-custom', 'cleanquote-inline');
      style.textContent = css;
      document.head.appendChild(style);
      link.remove();
    })
    .catch(function () { /* keep link if fetch fails */ });

  var s = document.createElement('script');
  s.src = origin + '/api/script/ghl-agency-master.js';
  s.async = false;
  document.head.appendChild(s);
})();
