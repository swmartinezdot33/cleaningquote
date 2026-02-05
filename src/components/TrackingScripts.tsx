'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TrackingScriptsProps {
  trackingCodes: {
    customHeadCode?: string;
  };
}

/** True when on a quote results page (/quote/[id] or /t/.../quote/[id]). */
function isQuotePage(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.match(/^\/quote\/[^/]+$/)) return true;
  if (pathname.match(/^\/t\/[^/]+\/quote\/[^/]+$/)) return true;
  if (pathname.match(/^\/t\/[^/]+\/[^/]+\/quote\/[^/]+$/)) return true;
  return false;
}

/** True when on any tool page (/t/[slug] or /t/[org]/[tool]) so we inject that tool's tracking. */
function isToolPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/t/') && pathname.length > 3 && pathname.charAt(3) !== '/';
}

export function TrackingScripts({ trackingCodes }: TrackingScriptsProps) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') || false;

  useEffect(() => {
    if (isAdminPage) return;
    if (!trackingCodes.customHeadCode?.trim()) return;
    const onToolPage = isToolPage(pathname ?? null);
    const onQuotePage = isQuotePage(pathname ?? null);
    if (!onToolPage && !onQuotePage) return;

    const idPrefix = 'tool-tracking-';
    const removePrevious = () => {
      document.querySelectorAll(`[id^="${idPrefix}"]`).forEach((el) => el.remove());
    };
    removePrevious();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = trackingCodes.customHeadCode;

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

    const otherElements = Array.from(tempDiv.children).filter(el => el.tagName !== 'SCRIPT');
    otherElements.forEach((el, index) => {
      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.id = cloned.id || `${idPrefix}element-${index}`;
      document.head.appendChild(cloned);
    });

    if (scripts.length === 0 && otherElements.length === 0) {
      const script = document.createElement('script');
      script.id = `${idPrefix}code`;
      script.innerHTML = trackingCodes.customHeadCode;
      document.head.appendChild(script);
    }

    return removePrevious;
  }, [isAdminPage, pathname, trackingCodes.customHeadCode]);

  return null;
}
