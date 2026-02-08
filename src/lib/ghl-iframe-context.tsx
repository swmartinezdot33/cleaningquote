'use client';

/**
 * GHL Iframe Context — matches MaidCentral (working) implementation.
 * Gets locationId from: URL params, iframe path, referrer, session cache, postMessage + decrypt.
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
      // Store on backend (matches MaidCentral)
      fetch('/api/ghl/iframe-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      }).catch((err) => console.error('[GHL Iframe] Failed to store iframe context:', err));
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

    // 1. URL params (query + hash)
    const urlParams = new URLSearchParams(window.location?.search ?? '');
    const hashParams = new URLSearchParams((window.location?.hash ?? '').substring(1));
    const pathname = window.location?.pathname ?? '';

    let urlLocationId =
      urlParams.get('locationId') ||
      urlParams.get('location_id') ||
      urlParams.get('location') ||
      urlParams.get('companyId') ||
      urlParams.get('company_id') ||
      hashParams.get('locationId') ||
      hashParams.get('location_id') ||
      hashParams.get('location');

    // 2. From current URL path (/location/{id}/)
    if (!urlLocationId) {
      const pathMatch = pathname.match(/\/location\/([^/]+)/i);
      if (pathMatch?.[1]) urlLocationId = pathMatch[1];
    }

    // 3. From iframe src path (when in iframe)
    if (!urlLocationId && isInIframe) {
      const iframePathMatch = pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
      if (iframePathMatch?.[1]) urlLocationId = iframePathMatch[1];
      if (!urlLocationId) {
        const parts = pathname.split('/');
        const id = parts.find((p) => p.length >= 15 && p.length <= 30 && /^[a-zA-Z0-9]+$/.test(p));
        if (id) urlLocationId = id;
      }
    }

    // 4. Referrer (GHL parent URL)
    if (!urlLocationId && typeof document !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        if (/gohighlevel|leadconnector/i.test(referrerUrl.hostname)) {
          const refMatch = referrerUrl.pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
          urlLocationId = refMatch?.[1] ?? referrerUrl.searchParams.get('locationId') ?? referrerUrl.searchParams.get('location_id') ?? urlLocationId;
        }
      } catch {
        /* ignore */
      }
    }

    const urlUserId = urlParams.get('userId') || urlParams.get('user_id') || hashParams.get('userId') || hashParams.get('user_id');

    if (urlLocationId) {
      hasLocationIdRef.current = true;
      apply({ locationId: urlLocationId, userId: urlUserId || undefined });
    }

    // 5. Session cache
    if (!hasLocationIdRef.current && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('ghl_iframeData');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as GHLIframeData;
          if (parsed.locationId) {
            hasLocationIdRef.current = true;
            setGhlData(parsed);
            setError(null);
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

    // 6. postMessage from GHL (REQUEST_USER_DATA) — matches GHL docs & MaidCentral
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

        if (data.message === 'REQUEST_USER_DATA_RESPONSE' && data.payload != null) {
          // GHL sends encrypted string or array; extract raw encrypted data
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
              } else if (typeof data.payload === 'object' && data.payload?.locationId) {
                hasLocationIdRef.current = true;
                apply({ locationId: data.payload.locationId, ...data.payload });
              } else if (result?.error && process.env.NODE_ENV === 'development') {
                console.warn('[GHL Iframe] Decrypt failed:', result.error, result.hint);
              }
            })
            .catch((err) => {
              console.error('[GHL Iframe] Decrypt error:', err);
              if (typeof data.payload === 'object' && data.payload?.locationId) {
                hasLocationIdRef.current = true;
                apply({ locationId: data.payload.locationId, ...data.payload });
              }
            });
          return;
        }

        const locationId =
          data.locationId ??
          data.location_id ??
          data.activeLocation ??
          data.location?.id ??
          data.context?.locationId ??
          data.payload?.locationId;
        if (locationId) {
          hasLocationIdRef.current = true;
          apply({
            locationId,
            userId: data.userId ?? data.payload?.userId,
            companyId: data.companyId ?? data.payload?.companyId,
            locationName: data.locationName ?? data.payload?.locationName,
            userName: data.userName ?? data.payload?.userName,
            userEmail: data.userEmail ?? data.payload?.userEmail,
          });
        }
      } catch (err) {
        console.error('[GHL Iframe] Message parse error:', err);
      }
    };

    window.addEventListener('message', handleMessage);

    if (window.parent && window.parent !== window) {
      // Send REQUEST_USER_DATA per GHL docs; retry for slow-loading parent
      const sendRequest = () => window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
      sendRequest();
      const t1 = setTimeout(sendRequest, 100);
      const t2 = setTimeout(sendRequest, 500);
      const t3 = setTimeout(sendRequest, 1000);
      const t4 = setTimeout(sendRequest, 2000);
      const t5 = setTimeout(sendRequest, 4000);
      const t6 = setTimeout(() => {
        if (!hasLocationIdRef.current) {
          setError(
            'No GHL context received. Open from a sub-account dashboard (not Agency view). ' +
            'Ensure GHL_APP_SSO_KEY matches your CleanQuote app Shared Secret in Marketplace App → Auth.'
          );
          setLoading(false);
        }
      }, 6000);
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearTimeout(t6);
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
