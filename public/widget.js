/**
 * Raleigh Cleaning Company Quote Widget
 * Embed this script on your website to display the cleaning quote form
 * 
 * Customization options via data attributes:
 * data-base-url="https://yoursite.com" - Base URL of your site
 * data-widget-id="my-widget" - Custom widget container ID
 * data-mobile-height="800" - Height in pixels for mobile (default: 900px)
 * data-desktop-height="600" - Min height in pixels for desktop (default: 600px)
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
  const mobileHeight = parseInt(scriptTag?.dataset.mobileHeight || '900', 10);
  const desktopHeight = parseInt(scriptTag?.dataset.desktopHeight || '600', 10);

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

  // Detect if device is mobile
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
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

    // Determine initial height based on device type
    const isMobile = isMobileDevice();
    const initialHeight = isMobile ? mobileHeight : desktopHeight;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = `
      width: 100%;
      max-width: 800px;
      min-height: ${initialHeight}px;
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

    // Handle postMessage communication for responsive sizing and tracking events
    window.addEventListener('message', function (event) {
      if (event.origin !== baseUrl) return;

      if (event.data.type === 'widget:resize') {
        iframe.style.minHeight = event.data.height + 'px';
      }
      
      // Handle tracking events
      if (event.data.type === 'widget:tracking') {
        handleTrackingEvent(event.data.eventType, event.data.eventData);
      }
    });

    // Handle window resize to adjust height for responsive changes
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        const nowMobile = isMobileDevice();
        const newHeight = nowMobile ? mobileHeight : desktopHeight;
        iframe.style.minHeight = newHeight + 'px';
      }, 250);
    });
  }
  
  // Function to fire tracking events in parent window
  function handleTrackingEvent(eventType, eventData) {
    // Google Analytics / gtag
    if (typeof gtag !== 'undefined') {
      if (eventType === 'quote_submitted') {
        gtag('event', 'quote_submitted', {
          event_category: 'Quote',
          event_label: eventData.serviceType || 'unknown',
          value: 1,
        });
      } else if (eventType === 'appointment_booked') {
        gtag('event', 'appointment_booked', {
          event_category: 'Booking',
          event_label: eventData.serviceType || 'unknown',
          value: 1,
        });
      }
    }
    
    // Google Tag Manager dataLayer
    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: eventType,
        eventCategory: eventType === 'quote_submitted' ? 'Quote' : 'Booking',
        eventLabel: eventData.serviceType || 'unknown',
        ...eventData,
      });
    }
    
    // Meta Pixel / Facebook Pixel
    if (typeof fbq !== 'undefined') {
      if (eventType === 'quote_submitted') {
        fbq('track', 'Lead', {
          content_name: 'Quote Request',
          content_category: eventData.serviceType || 'unknown',
        });
      } else if (eventType === 'appointment_booked') {
        fbq('track', 'Schedule', {
          content_name: 'Appointment Booked',
          content_category: eventData.serviceType || 'unknown',
        });
      }
    }
    
    // Google Ads conversion tracking (if configured)
    if (eventType === 'quote_submitted' && typeof gtag !== 'undefined') {
      // Fire conversion event - conversion ID should be configured in parent page
      gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL', // These need to be configured
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }
})();
