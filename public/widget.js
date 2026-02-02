/**
 * Raleigh Cleaning Company Quote Widget
 * Embed this script on your website to display the cleaning quote form
 * 
 * BASIC USAGE:
 * <div id="cleaning-quote-widget"></div>
 * <script src="https://yoursite.com/widget.js" 
 *   data-base-url="https://yoursite.com"
 *   data-container-id="cleaning-quote-widget">
 * </script>
 * 
 * HEIGHT CUSTOMIZATION (IMPORTANT - Makes sure questions always fit!):
 * 
 * OPTION 1: Simple Fixed Height (RECOMMENDED for small containers)
 *   data-height="1200" - Sets fixed height in pixels (works on all devices)
 * 
 * OPTION 2: Responsive Heights (RECOMMENDED for flexible layouts)
 *   data-mobile-height="1200" - Height for mobile devices (default: 900px)
 *   data-tablet-height="1000" - Height for tablets (default: 900px)
 *   data-desktop-height="800"  - Height for desktop (default: 600px)
 * 
 * OPTION 3: Breakpoint-Specific (for fine control)
 *   data-small-height="1400"   - Screens <= 480px (default: mobile-height)
 *   data-medium-height="1200"  - Screens 481-1024px (default: tablet-height)
 *   data-large-height="900"    - Screens > 1024px (default: desktop-height)
 * 
 * MULTI-TENANT / TOOL (white-label):
 * data-tool="acme-cleaning"              - Tool slug for this embed (survey: /t/acme-cleaning). Default: "default"
 * data-tool-slug="acme-cleaning"         - Alternative to data-tool (same effect)
 * data-org-slug="my-org"                 - Org slug (recommended). With data-tool, uses /t/my-org/acme-cleaning so quotes always go to this org even if another org reuses the same tool slug.
 *
 * OTHER CUSTOMIZATION OPTIONS:
 * data-base-url="https://yoursite.com"   - Base URL of your site (required)
 * data-container-id="my-widget"          - Container element ID (required)
 * data-widget-id="my-widget"             - Alternative to container-id
 * data-max-width="600"                   - Max width in pixels (default: 800px)
 * 
 * QUERY PARAMETERS (passed from parent page into the iframe and used for attribution):
 * All parent URL params (UTM, gclid, start, tashiane, etc.) are passed into the iframe.
 * Example: https://partner.com/getquote?start=iframe-Staver&utm_source=facebook
 *
 * GHL CONTACT VARIABLE PLACEHOLDERS (auto-fills form if available):
 * data-first-name="{{contact.firstName}}"
 * data-last-name="{{contact.lastName}}"
 * data-phone="{{contact.phone}}"
 * data-email="{{contact.email}}"
 * data-address="{{contact.address}}"
 * data-city="{{contact.city}}"
 * data-state="{{contact.state}}"
 * data-postal-code="{{contact.postalCode}}"
 * data-contact-id="{{contact.id}}"  - GHL contact ID: pre-fill and associate quote with this contact
 * 
 * EXAMPLE - Small Embedded Container (Sidebar):
 * <div id="quote-widget" style="width: 100%; max-width: 400px;"></div>
 * <script src="https://yoursite.com/widget.js"
 *   data-base-url="https://yoursite.com"
 *   data-container-id="quote-widget"
 *   data-height="1400">
 * </script>
 * 
 * EXAMPLE - Responsive Container (Main Content):
 * <div id="quote-widget"></div>
 * <script src="https://yoursite.com/widget.js"
 *   data-base-url="https://yoursite.com"
 *   data-container-id="quote-widget"
 *   data-mobile-height="1200"
 *   data-tablet-height="1000"
 *   data-desktop-height="900">
 * </script>
 */

(function () {
  // Configuration from data attributes or defaults
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const baseUrl = scriptTag?.dataset.baseUrl || window.location.origin;
  const widgetId = scriptTag?.dataset.widgetId || 'cleaning-quote-widget';
  const containerId = scriptTag?.dataset.containerId || widgetId;
  // Tool slug for multi-tenant: survey at /t/{slug} or /t/{orgSlug}/{slug} when org-scoped. Default "default" for backward compatibility.
  const toolSlug = (scriptTag?.dataset.tool || scriptTag?.dataset.toolSlug || 'default').trim() || 'default';
  const orgSlug = (scriptTag?.dataset.orgSlug || '').trim() || null;
  
  // Height configuration - supports multiple options
  // OPTION 1: Single fixed height for all devices
  const fixedHeight = scriptTag?.dataset.height ? parseInt(scriptTag.dataset.height, 10) : null;
  
  // OPTION 2: Responsive heights by device type (fallback)
  const mobileHeight = parseInt(scriptTag?.dataset.mobileHeight || '900', 10);
  const tabletHeight = parseInt(scriptTag?.dataset.tabletHeight || scriptTag?.dataset.mobileHeight || '900', 10);
  const desktopHeight = parseInt(scriptTag?.dataset.desktopHeight || '600', 10);
  
  // OPTION 3: Breakpoint-specific heights (most control)
  const smallHeight = scriptTag?.dataset.smallHeight ? parseInt(scriptTag.dataset.smallHeight, 10) : null;
  const mediumHeight = scriptTag?.dataset.mediumHeight ? parseInt(scriptTag.dataset.mediumHeight, 10) : null;
  const largeHeight = scriptTag?.dataset.largeHeight ? parseInt(scriptTag.dataset.largeHeight, 10) : null;
  
  // Max width configuration
  const maxWidth = parseInt(scriptTag?.dataset.maxWidth || '800', 10);

  // Extract all query parameters from parent page URL (UTM, gclid, start, and any custom params)
  // This allows the iframe to receive and use params like ?start=iframe-Staver&tashiane=Verther
  function extractParentQueryParams() {
    const params = new URLSearchParams();
    const parentParams = new URLSearchParams(window.location.search);
    
    parentParams.forEach((value, key) => {
      params.append(key, value);
    });
    
    return params;
  }

  // Build query parameters: parent URL params + data-attribute overrides (for form pre-fill)
  function buildQueryString() {
    const params = extractParentQueryParams(); // Start with all params from parent page
    params.delete('embedded'); // we add embedded=true to the iframe URL explicitly
    
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
      'contactId': 'data-contact-id',
    };

    for (const [paramName, attrName] of Object.entries(attributeMap)) {
      const value = scriptTag?.dataset[attrName.replace('data-', '')] || scriptTag?.getAttribute(attrName);
      if (value && String(value).trim() && !String(value).includes('{{')) {
        // Override with data attribute (e.g. GHL {{contact.id}}, {{contact.firstName}})
        params.set(paramName, String(value).trim());
      }
    }

    return params.toString();
  }

  // Detect if device is mobile
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
  }

  // Get appropriate height based on screen size
  function getHeightForScreenSize() {
    // If fixed height is set, always use it
    if (fixedHeight !== null) {
      return fixedHeight;
    }
    
    // If breakpoint heights are set, use them
    if (smallHeight !== null || mediumHeight !== null || largeHeight !== null) {
      const width = window.innerWidth;
      if (width <= 480) {
        return smallHeight !== null ? smallHeight : mobileHeight;
      } else if (width <= 1024) {
        return mediumHeight !== null ? mediumHeight : tabletHeight;
      } else {
        return largeHeight !== null ? largeHeight : desktopHeight;
      }
    }
    
    // Fallback to device-type detection
    const isMobile = isMobileDevice();
    return isMobile ? mobileHeight : desktopHeight;
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

    // Build iframe URL: org-scoped /t/{orgSlug}/{toolSlug} when set (recommended), else /t/{toolSlug}. Preserve query params (UTM, pre-fill, etc.)
    const pathSegment = orgSlug
      ? `t/${encodeURIComponent(orgSlug)}/${encodeURIComponent(toolSlug)}`
      : `t/${encodeURIComponent(toolSlug)}`;
    let iframeUrl = `${baseUrl}/${pathSegment}?embedded=true`;
    const queryString = buildQueryString();
    if (queryString) {
      iframeUrl += '&' + queryString;
    }

    // Get initial height based on screen size
    const initialHeight = getHeightForScreenSize();

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = `
      width: 100%;
      max-width: ${maxWidth}px;
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

    // Subtle "Powered by" attribution below the iframe
    const poweredBy = document.createElement('a');
    poweredBy.href = 'https://www.cleanquote.io';
    poweredBy.target = '_blank';
    poweredBy.rel = 'noopener noreferrer';
    poweredBy.textContent = 'Powered by CleanQuote.io';
    poweredBy.style.cssText = `
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: #9ca3af;
      text-decoration: none;
      text-align: center;
      transition: color 0.15s ease;
    `;
    poweredBy.addEventListener('mouseenter', function () { this.style.color = '#6b7280'; });
    poweredBy.addEventListener('mouseleave', function () { this.style.color = '#9ca3af'; });
    container.appendChild(poweredBy);

    // Handle postMessage communication for responsive sizing, tracking events, and navigation
    window.addEventListener('message', function (event) {
      if (event.origin !== baseUrl) return;

      if (event.data.type === 'widget:resize') {
        iframe.style.minHeight = event.data.height + 'px';
      }
      
      // Handle tracking events
      if (event.data.type === 'widget:tracking') {
        handleTrackingEvent(event.data.eventType, event.data.eventData);
      }
      
      // Handle iframe navigation (for redirects that preserve UTM params)
      if (event.data.type === 'widget:navigate') {
        const newUrl = event.data.url;
        if (newUrl && newUrl.startsWith(baseUrl)) {
          // Update iframe src to new URL (preserves UTM params)
          iframe.src = newUrl;
        }
      }
    });

    // Handle window resize to adjust height for responsive changes
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        const newHeight = getHeightForScreenSize();
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
    
    // Google Ads conversion tracking
    if (typeof gtag !== 'undefined') {
      // Get conversion ID and label from window (set by parent page or this script)
      const conversionId = window.__GOOGLE_ADS_CONVERSION_ID;
      const conversionLabel = window.__GOOGLE_ADS_CONVERSION_LABEL;
      
      if (conversionId && conversionLabel) {
        if (eventType === 'quote_submitted' || eventType === 'appointment_booked') {
          gtag('event', 'conversion', {
            'send_to': `${conversionId}/${conversionLabel}`,
          });
        }
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }
})();
