/**
 * GHL Agency Loader – one script that loads the CSS and master script.
 * Same pattern as everypages ghl_customizer.php → ghl_customize.php.
 *
 * In GHL: Custom JavaScript, add one line:
 *   <script src="https://www.cleanquote.io/api/script/ghl-agency-loader.js"></script>
 *
 * This loader then injects:
 *   1. ghl-agency-custom-css.css (login + dashboard styles, logo block)
 *   2. ghl-agency-master.js (logo swap, sidebar, favicon, etc.)
 */
(function () {
  var script = document.currentScript;
  if (!script || !script.src) return;
  var base = script.src.replace(/\/api\/script\/ghl-agency-loader\.js.*$/, '');
  var origin = base || 'https://www.cleanquote.io';

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = origin + '/scripts/ghl-agency-custom-css.css';
  link.setAttribute('data-ghl-custom', 'cleanquote');
  document.head.appendChild(link);

  var s = document.createElement('script');
  s.src = origin + '/api/script/ghl-agency-master.js';
  s.async = false;
  document.head.appendChild(s);
})();
