'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SCRIPT_ID = 'cleanquote-google-maps-api';

/**
 * Loads the Google Maps script with the correct API key:
 * - On /t/[slug] routes, fetches that tool's key from /api/tools/[slug]/config (tool-only) and injects once known.
 * - Otherwise uses the global key from the server.
 * Ensures each tool uses its own key so tools are independent.
 */
export function MapsScriptLoader({ globalKey }: { globalKey: string }) {
  const pathname = usePathname();
  const [keyToUse, setKeyToUse] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname?.match(/^\/t\/([^/]+)/);
    const slug = match?.[1];

    if (!slug) {
      setKeyToUse(globalKey || null);
      return;
    }

    let cancelled = false;
    fetch(`/api/tools/${encodeURIComponent(slug)}/config?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const toolKey = data?.googleMapsKey && typeof data.googleMapsKey === 'string' ? data.googleMapsKey : null;
        setKeyToUse(toolKey || globalKey || null);
      })
      .catch(() => {
        if (!cancelled) setKeyToUse(globalKey || null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, globalKey]);

  useEffect(() => {
    if (!keyToUse) return;

    if (typeof document === 'undefined') return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${keyToUse}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [keyToUse]);

  return null;
}
