'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TrackingScripts } from '@/components/TrackingScripts';
import { getToolSlugFromPath } from '@/lib/tools/path';

/** Tool-scoped tracking: on /t/[slug] or /t/[org]/[tool] fetches that tool's tracking and passes to TrackingScripts. No global analytics. */
export function ToolScopedTracking() {
  const pathname = usePathname();
  const [trackingCodes, setTrackingCodes] = useState<{ customHeadCode?: string }>({});

  useEffect(() => {
    const slug = getToolSlugFromPath(pathname ?? null);
    if (!slug) {
      setTrackingCodes({});
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
        const codes = data?.trackingCodes && typeof data.trackingCodes === 'object'
          ? (data.trackingCodes as { customHeadCode?: string })
          : {};
        setTrackingCodes(codes);
      })
      .catch(() => {
        if (!cancelled) setTrackingCodes({});
      });
    return () => { cancelled = true; };
  }, [pathname]);

  return <TrackingScripts trackingCodes={trackingCodes} />;
}
