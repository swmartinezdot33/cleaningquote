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

    // Google Analytics
    if (trackingCodes.googleAnalyticsId) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingCodes.googleAnalyticsId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingCodes.googleAnalyticsId}');
      `;
      document.head.appendChild(script2);
    }

    // Google Ads Conversion Tracking
    if (trackingCodes.googleAdsConversionId) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingCodes.googleAdsConversionId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingCodes.googleAdsConversionId}');
      `;
      document.head.appendChild(script2);
    }

    // Google Tag Manager
    if (trackingCodes.googleTagManagerId) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${trackingCodes.googleTagManagerId}`;
      document.head.appendChild(script);
    }

    // Meta Pixel / Facebook Pixel
    if (trackingCodes.metaPixelId) {
      const script = document.createElement('script');
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
    }

    // Custom Head Code
    if (trackingCodes.customHeadCode) {
      const script = document.createElement('script');
      script.innerHTML = trackingCodes.customHeadCode;
      document.head.appendChild(script);
    }
  }, [isAdminPage, trackingCodes]);

  return null;
}
