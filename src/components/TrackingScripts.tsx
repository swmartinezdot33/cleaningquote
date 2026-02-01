'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TrackingScriptsProps {
  trackingCodes: {
    customHeadCode?: string;
  };
}

/** True when on a quote results page (/quote/[id] or /t/[slug]/quote/[id]). Custom code loads only here to track when quotes are given. */
function isQuotePage(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.match(/^\/quote\/[^/]+$/)) return true;
  if (pathname.match(/^\/t\/[^/]+\/quote\/[^/]+$/)) return true;
  return false;
}

export function TrackingScripts({ trackingCodes }: TrackingScriptsProps) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') || false;

  useEffect(() => {
    if (isAdminPage) return;
    if (!trackingCodes.customHeadCode?.trim()) return;
    if (!isQuotePage(pathname ?? null)) return;

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
      newScript.id = `custom-head-script-${index}`;
      document.head.appendChild(newScript);
    });

    const otherElements = Array.from(tempDiv.children).filter(el => el.tagName !== 'SCRIPT');
    otherElements.forEach((el, index) => {
      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.id = cloned.id || `custom-head-element-${index}`;
      document.head.appendChild(cloned);
    });

    if (scripts.length === 0 && otherElements.length === 0) {
      const script = document.createElement('script');
      script.id = 'custom-head-code';
      script.innerHTML = trackingCodes.customHeadCode;
      document.head.appendChild(script);
    }
  }, [isAdminPage, pathname, trackingCodes.customHeadCode]);

  return null;
}
