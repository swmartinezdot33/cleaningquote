'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TrackingScriptsProps {
  trackingCodes: {
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    metaPixelId?: string;
    customHeadCode?: string;
    googleAdsConversionId?: string;
    googleAdsConversionLabel?: string;
  };
}

export function TrackingScripts({ trackingCodes }: TrackingScriptsProps) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') || false;

  useEffect(() => {
    // Don't load any tracking scripts on admin pages
    if (isAdminPage) {
      return;
    }

    // Track which scripts have been added to prevent duplicates
    const addedScripts = new Set<string>();

    // Google Analytics
    if (trackingCodes.googleAnalyticsId && !addedScripts.has('ga')) {
      addedScripts.add('ga');
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingCodes.googleAnalyticsId}`;
      script1.id = 'ga-script-loader';
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.id = 'ga-script-config';
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingCodes.googleAnalyticsId}');
      `;
      document.head.appendChild(script2);
      console.log('✅ Google Analytics loaded:', trackingCodes.googleAnalyticsId);
    }

    // Google Ads Conversion Tracking
    if (trackingCodes.googleAdsConversionId && !addedScripts.has('gads')) {
      addedScripts.add('gads');
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingCodes.googleAdsConversionId}`;
      script1.id = 'gads-script-loader';
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.id = 'gads-script-config';
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingCodes.googleAdsConversionId}');
      `;
      document.head.appendChild(script2);
      console.log('✅ Google Ads Conversion loaded:', trackingCodes.googleAdsConversionId);
    }

    // Google Tag Manager
    if (trackingCodes.googleTagManagerId && !addedScripts.has('gtm')) {
      addedScripts.add('gtm');
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${trackingCodes.googleTagManagerId}`;
      script.id = 'gtm-script';
      document.head.appendChild(script);
      
      // Also add GTM noscript to body
      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${trackingCodes.googleTagManagerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.appendChild(noscript);
      console.log('✅ Google Tag Manager loaded:', trackingCodes.googleTagManagerId);
    }

    // Meta Pixel / Facebook Pixel
    if (trackingCodes.metaPixelId && !addedScripts.has('fbpixel')) {
      addedScripts.add('fbpixel');
      const script = document.createElement('script');
      script.id = 'fb-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${trackingCodes.metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
      console.log('✅ Meta Pixel loaded:', trackingCodes.metaPixelId);
    }

    // Custom Head Code - can contain any HTML/scripts
    if (trackingCodes.customHeadCode && !addedScripts.has('custom')) {
      addedScripts.add('custom');
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = trackingCodes.customHeadCode;
      
      // Extract and insert all script tags
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach((script, index) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
          newScript.defer = script.defer;
        } else {
          newScript.innerHTML = script.innerHTML;
        }
        newScript.id = `custom-head-script-${index}`;
        document.head.appendChild(newScript);
      });
      
      // Insert any non-script elements (like meta tags, links, etc.)
      const otherElements = Array.from(tempDiv.children).filter(el => el.tagName !== 'SCRIPT');
      otherElements.forEach((el, index) => {
        const cloned = el.cloneNode(true) as HTMLElement;
        cloned.id = cloned.id || `custom-head-element-${index}`;
        document.head.appendChild(cloned);
      });
      
      // If no script tags found, insert the raw HTML as innerHTML
      if (scripts.length === 0 && otherElements.length === 0) {
        const script = document.createElement('script');
        script.id = 'custom-head-code';
        script.innerHTML = trackingCodes.customHeadCode;
        document.head.appendChild(script);
      }
      
      console.log('✅ Custom Head Code loaded:', {
        scriptsFound: scripts.length,
        otherElementsFound: otherElements.length,
        preview: trackingCodes.customHeadCode.substring(0, 100) + '...'
      });
    }
  }, [isAdminPage, trackingCodes]);

  return null;
}
