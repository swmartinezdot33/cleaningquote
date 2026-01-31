'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const META_PIXEL_ID = '235480450645286';

/**
 * Allowed pathnames for Meta Pixel (marketing/site visit tracking only).
 * Excludes dashboard, admin, quote flow, invite, auth — no customer data.
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
 * Loads and fires Meta Pixel only on allowed frontend pages so we can track
 * site visits and retarget without firing on quote tool, dashboard, or
 * other pages that may contain customer data.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const scriptInjected = useRef(false);

  useEffect(() => {
    if (!isPathAllowed(pathname)) return;
    if (typeof window === 'undefined') return;

    const trackPageView = () => {
      (window as any).fbq('init', META_PIXEL_ID);
      (window as any).fbq('track', 'PageView');
    };

    if ((window as any).fbq && (window as any).fbq.queue) {
      trackPageView();
      return;
    }

    if (!scriptInjected.current) {
      scriptInjected.current = true;
      const f = window as any;
      const b = document;
      const e = 'script';
      const v = 'https://connect.facebook.net/en_US/fbevents.js';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n: any = (f.fbq = function () {
        // eslint-disable-next-line prefer-rest-params
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      const t = b.createElement(e);
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode?.insertBefore(t, s);
      t.onload = trackPageView;
    }
  }, [pathname]);

  return null;
}
