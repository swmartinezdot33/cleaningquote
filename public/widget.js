/**
 * Raleigh Cleaning Company Quote Widget
 * Embed this script on your website to display the cleaning quote form
 * 
 * Supports GHL contact variable placeholders:
 * data-first-name="{{contact.firstName}}"
 * data-last-name="{{contact.lastName}}"
 * data-phone="{{contact.phone}}"
 * data-email="{{contact.email}}"
 * data-address="{{contact.address}}"
 * data-city="{{contact.city}}"
 * data-state="{{contact.state}}"
 * data-postal-code="{{contact.postalCode}}"
 */

(function () {
  // Configuration from data attributes or defaults
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const baseUrl = scriptTag?.dataset.baseUrl || window.location.origin;
  const widgetId = scriptTag?.dataset.widgetId || 'cleaning-quote-widget';
  const containerId = scriptTag?.dataset.containerId || widgetId;

  // Build query parameters from data attributes
  function buildQueryString() {
    const params = new URLSearchParams();
    
    // Map of data attributes to query parameter names
    const attributeMap = {
      'firstName': 'data-first-name',
      'lastName': 'data-last-name',
      'phone': 'data-phone',
      'email': 'data-email',
      'address': 'data-address',
      'city': 'data-city',
      'state': 'data-state',
      'postalCode': 'data-postal-code',
    };

    for (const [paramName, attrName] of Object.entries(attributeMap)) {
      const value = scriptTag?.dataset[attrName.replace('data-', '')] || scriptTag?.getAttribute(attrName);
      if (value && value.trim() && !value.includes('{{')) {
        // Only add if value exists and doesn't contain unreplaced template variables
        params.append(paramName, value);
      }
    }

    return params.toString();
  }

  // Create iframe container
  function initializeWidget() {
    // Find or create container
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    // Build iframe URL with query parameters
    let iframeUrl = `${baseUrl}/?embedded=true`;
    const queryString = buildQueryString();
    if (queryString) {
      iframeUrl += `&${queryString}`;
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
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
