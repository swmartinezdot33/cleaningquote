/**
 * Raleigh Cleaning Company Quote Widget
 * Embed this script on your website to display the cleaning quote form
 */

(function () {
  // Configuration from data attributes or defaults
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const baseUrl = scriptTag?.dataset.baseUrl || window.location.origin;
  const widgetId = scriptTag?.dataset.widgetId || 'cleaning-quote-widget';
  const containerId = scriptTag?.dataset.containerId || widgetId;

  // Create iframe container
  function initializeWidget() {
    // Find or create container
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${baseUrl}/?embedded=true`;
    iframe.style.cssText = `
      width: 100%;
      max-width: 800px;
      min-height: 600px;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
      display: block;
    `;
    iframe.title = 'Cleaning Quote Calculator';
    iframe.allowFullscreen = true;

    container.innerHTML = '';
    container.appendChild(iframe);

    // Handle postMessage communication for responsive sizing
    window.addEventListener('message', function (event) {
      if (event.origin !== baseUrl) return;

      if (event.data.type === 'widget:resize') {
        iframe.style.minHeight = event.data.height + 'px';
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }
})();
