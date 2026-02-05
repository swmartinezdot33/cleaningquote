'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export interface TrackingCodesProps {
  customHeadCode?: string;
  trackingQuoteSummary?: string;
  trackingAppointmentBooking?: string;
}

/** True when on a quote result page (summary), excluding appointment/callback confirmed. */
function isQuoteSummaryPage(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.includes('/appointment-confirmed') || pathname.includes('/callback-confirmed')) return false;
  if (pathname.match(/^\/quote\/[^/]+$/)) return true;
  if (pathname.match(/^\/t\/[^/]+\/quote\/[^/]+$/)) return true;
  if (pathname.match(/^\/t\/[^/]+\/[^/]+\/quote\/[^/]+$/)) return true;
  return false;
}

/** True when on appointment-confirmed or callback-confirmed. */
function isAppointmentBookingPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.includes('/appointment-confirmed') || pathname.includes('/callback-confirmed');
}

/** True when on any tool page (/t/[slug] or /t/[org]/[tool]). */
function isToolPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/t/') && pathname.length > 3 && pathname.charAt(3) !== '/';
}

const ID_PREFIX = 'tool-tracking-';

function injectCodeIntoHead(html: string, idPrefix: string): () => void {
  const removePrevious = () => {
    document.querySelectorAll(`[id^="${idPrefix}"]`).forEach((el) => el.remove());
  };
  removePrevious();

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

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
    newScript.id = `${idPrefix}script-${index}`;
    document.head.appendChild(newScript);
  });

  const otherElements = Array.from(tempDiv.children).filter((el) => el.tagName !== 'SCRIPT');
  otherElements.forEach((el, index) => {
    const cloned = el.cloneNode(true) as HTMLElement;
    cloned.id = cloned.id || `${idPrefix}element-${index}`;
    document.head.appendChild(cloned);
  });

  if (scripts.length === 0 && otherElements.length === 0) {
    const script = document.createElement('script');
    script.id = `${idPrefix}code`;
    script.innerHTML = html;
    document.head.appendChild(script);
  }

  return removePrevious;
}

export function TrackingScripts({ trackingCodes }: { trackingCodes: TrackingCodesProps }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') ?? false;
  const onToolPage = isToolPage(pathname ?? null);
  const onQuoteSummary = isQuoteSummaryPage(pathname ?? null);
  const onAppointmentBooking = isAppointmentBookingPage(pathname ?? null);

  // 1. Every page: inject on any tool page (form, quote summary, appointment confirmed)
  useEffect(() => {
    if (isAdminPage || !onToolPage) return;
    const code = trackingCodes.customHeadCode?.trim();
    if (!code) return;
    return injectCodeIntoHead(code, `${ID_PREFIX}every-`);
  }, [isAdminPage, onToolPage, pathname, trackingCodes.customHeadCode]);

  // 2. Quote Summary only: inject only on quote result page (not appointment-confirmed)
  useEffect(() => {
    if (isAdminPage || !onQuoteSummary) return;
    const code = trackingCodes.trackingQuoteSummary?.trim();
    if (!code) return;
    return injectCodeIntoHead(code, `${ID_PREFIX}quote-summary-`);
  }, [isAdminPage, onQuoteSummary, pathname, trackingCodes.trackingQuoteSummary]);

  // 3. Appointment booking only: inject on appointment-confirmed / callback-confirmed
  useEffect(() => {
    if (isAdminPage || !onAppointmentBooking) return;
    const code = trackingCodes.trackingAppointmentBooking?.trim();
    if (!code) return;
    return injectCodeIntoHead(code, `${ID_PREFIX}appointment-`);
  }, [isAdminPage, onAppointmentBooking, pathname, trackingCodes.trackingAppointmentBooking]);

  return null;
}
