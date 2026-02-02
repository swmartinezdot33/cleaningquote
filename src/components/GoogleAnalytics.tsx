'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const GA_MEASUREMENT_ID = 'G-730E7ZJ7VD';

/**
 * Allowed pathnames for Google Analytics (marketing/site visit tracking only).
 * Matches MetaPixel: excludes dashboard, admin, quote flow, invite, auth — no customer data.
 */
const ALLOWED_PATHS = [
  '/',           // marketing home
  '/login',
  '/signup',
  '/subscribe',
  '/subscribe/success',
  '/privacy',
  '/terms',
  '/out-of-service',
];

const ALLOWED_PREFIXES = [
  '/help',       // /help, /help/google-maps-api, etc.
];

function isPathAllowed(pathname: string | null): boolean {
  if (!pathname) return false;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/**
 * Loads Google Analytics (gtag.js) for CleanQuote.io marketing site tracking.
 * Only fires on allowed frontend pages—no quote tool, dashboard, or customer data pages.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  if (!isPathAllowed(pathname)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
