'use client';

/**
 * GHL Iframe Context
 * Listens for postMessage from GHL parent to get location ID and user data.
 * When CleanQuote runs inside GHL (iframe), GHL provides user/location via REQUEST_USER_DATA.
 */

import { useEffect, useState, createContext, useContext, useRef } from 'react';
import type { GHLIframeData } from './ghl-iframe-types';

export type { GHLIframeData };

interface GHLIframeContextType {
  ghlData: GHLIframeData | null;
  loading: boolean;
  error: string | null;
}

const GHLIframeContext = createContext<GHLIframeContextType>({
  ghlData: null,
  loading: true,
  error: null,
});

export function useGHLIframe() {
  return useContext(GHLIframeContext);
}

function setGHLContext(
  context: GHLIframeData,
  setGhlData: (d: GHLIframeData | null) => void,
  setError: (e: string | null) => void,
  setLoading: (l: boolean) => void
) {
  if (context.locationId) {
    setGhlData(context);
    setError(null);
    setLoading(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ghl_locationId', context.locationId);
      sessionStorage.setItem('ghl_iframeData', JSON.stringify(context));
      if (context.userId) sessionStorage.setItem('ghl_userId', context.userId);
    }
  }
}

export function GHLIframeProvider({ children }: { children: React.ReactNode }) {
  const [ghlData, setGhlData] = useState<GHLIframeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLocationIdRef = useRef(false);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    const apply = (ctx: GHLIframeData) => setGHLContext(ctx, setGhlData, setError, setLoading);

    // 1. URL params — only when NOT in iframe (standalone dev). In GHL iframe, use user context.
    if (!isInIframe) {
      const urlParams = new URLSearchParams(window.location?.search ?? '');
      const hashParams = new URLSearchParams((window.location?.hash ?? '').substring(1));
      const urlLocationId =
        urlParams.get('locationId') ||
        urlParams.get('location_id') ||
        urlParams.get('location') ||
        hashParams.get('locationId') ||
        hashParams.get('location_id');
      if (urlLocationId) {
        hasLocationIdRef.current = true;
        apply({ locationId: urlLocationId, userId: urlParams.get('userId') || hashParams.get('user_id') || undefined });
      }
    }

    // 2. Referrer (GHL loads custom apps in iframe; referrer may contain /location/{id}/)
    // Note: Referrer-Policy may strip path for cross-origin; URL params are more reliable.
    if (!hasLocationIdRef.current && typeof document !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        if (/gohighlevel|leadconnector/i.test(referrerUrl.hostname)) {
          const match = referrerUrl.pathname.match(/\/(?:v\d+\/)?location\/([A-Za-z0-9_-]{10,})/i);
          const refLocationId = match?.[1] ?? referrerUrl.searchParams.get('locationId') ?? referrerUrl.searchParams.get('location_id');
          if (refLocationId) {
            hasLocationIdRef.current = true;
            apply({ locationId: refLocationId });
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 3. Cached from sessionStorage
    if (!hasLocationIdRef.current && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('ghl_iframeData');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as GHLIframeData;
          if (parsed.locationId) {
            hasLocationIdRef.current = true;
            setGhlData(parsed);
            setLoading(false);
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!isInIframe) {
      if (!hasLocationIdRef.current) setLoading(false);
      return;
    }

    // 4. postMessage from GHL
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        if (data.message === 'REQUEST_USER_DATA_RESPONSE' && data.payload) {
          const rawPayload = Array.isArray(data.payload) ? data.payload[0] : data.payload;
          if (!rawPayload) return;
          fetch('/api/ghl/iframe-context/decrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedData: rawPayload }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((result) => {
              if (result?.success && result.locationId) {
                hasLocationIdRef.current = true;
                apply({
                  locationId: result.locationId,
                  userId: result.userId,
                  companyId: result.companyId,
                  locationName: result.locationName,
                  userName: result.userName,
                  userEmail: result.userEmail,
                });
              }
            })
            .catch((err) => console.error('[GHL Iframe] Decrypt error:', err));
          return;
        }

        const locationId =
          data.locationId ??
          data.location_id ??
          data.activeLocation ??
          data.location?.id ??
          data.context?.locationId ??
          data.context?.activeLocation ??
          data.payload?.locationId ??
          data.payload?.activeLocation;
        if (locationId) {
          hasLocationIdRef.current = true;
          apply({
            locationId,
            userId: data.userId ?? data.user_id ?? data.payload?.userId,
            companyId: data.companyId ?? data.company_id ?? data.payload?.companyId,
            locationName: data.locationName ?? data.location_name ?? data.payload?.locationName,
            userName: data.userName ?? data.user_name ?? data.payload?.userName,
            userEmail: data.userEmail ?? data.user_email ?? data.payload?.userEmail,
          });
        }
      } catch (err) {
        console.error('[GHL Iframe] Message parse error:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
      const t1 = setTimeout(() => window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*'), 500);
      const t2 = setTimeout(() => window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*'), 1500);
      const t3 = setTimeout(() => {
        if (!hasLocationIdRef.current) {
          setError('No GHL context received. Open this app from within GoHighLevel.');
          setLoading(false);
        }
      }, 5000);
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <GHLIframeContext.Provider value={{ ghlData, loading, error }}>
      {children}
    </GHLIframeContext.Provider>
  );
}
