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

    // [GHL Debug] Entry — same logging as MaidCentral
    console.log('[GHL Iframe] ========== context resolution start ==========');
    console.log('[GHL Iframe] isInIframe:', isInIframe);
    console.log('[GHL Iframe] href:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.log('[GHL Iframe] pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A');
    console.log('[GHL Iframe] search:', typeof window !== 'undefined' ? window.location.search : 'N/A');
    console.log('[GHL Iframe] document.referrer:', typeof document !== 'undefined' ? document.referrer || '(empty)' : 'N/A');

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

    if (urlLocationId) console.log('[GHL Iframe] ✅ 1. From URL params/hash:', urlLocationId);

    // 2. From current URL path (/location/{id}/)
    if (!urlLocationId) {
      const pathMatch = pathname.match(/\/location\/([^/]+)/i);
      if (pathMatch?.[1]) {
        urlLocationId = pathMatch[1];
        console.log('[GHL Iframe] ✅ 2. From path:', urlLocationId);
      }
    }

    // 3. From iframe src path (when in iframe) — MaidCentral checks v1/v2/location/xxx
    if (!urlLocationId && isInIframe) {
      const iframePathMatch = pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
      if (iframePathMatch?.[1]) {
        urlLocationId = iframePathMatch[1];
        console.log('[GHL Iframe] ✅ 3a. From iframe path (vN/location/xxx):', urlLocationId);
      }
      if (!urlLocationId) {
        const parts = pathname.split('/');
        const id = parts.find((p) => p.length >= 15 && p.length <= 30 && /^[a-zA-Z0-9]+$/.test(p));
        if (id) {
          urlLocationId = id;
          console.log('[GHL Iframe] ✅ 3b. From path parts (potential id):', urlLocationId);
        }
      }
    }

    // 4. Referrer (GHL parent) — MOST RELIABLE for custom menu links per MaidCentral
    if (!urlLocationId && typeof document !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        console.log('[GHL Iframe] 4. Referrer hostname:', referrerUrl.hostname, 'pathname:', referrerUrl.pathname);
        if (/gohighlevel|leadconnector/i.test(referrerUrl.hostname)) {
          const refMatch = referrerUrl.pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
          urlLocationId = refMatch?.[1] ?? referrerUrl.searchParams.get('locationId') ?? referrerUrl.searchParams.get('location_id') ?? urlLocationId;
          if (urlLocationId) console.log('[GHL Iframe] ✅ 4. From referrer:', urlLocationId);
        } else {
          console.log('[GHL Iframe] 4. Referrer not GHL hostname, skipping');
        }
      } catch (e) {
        console.warn('[GHL Iframe] 4. Referrer parse error:', e);
      }
    } else if (!urlLocationId && typeof document !== 'undefined') {
      console.log('[GHL Iframe] 4. document.referrer is empty (Referrer-Policy may block cross-origin)');
    }

    // 4b. window.name (MaidCentral also checks this)
    if (!urlLocationId && typeof window !== 'undefined' && window.name) {
      try {
        const nameData = JSON.parse(window.name) as Record<string, unknown>;
        const nid = nameData?.locationId ?? nameData?.location_id ?? nameData?.location;
        if (nid && typeof nid === 'string') {
          urlLocationId = nid;
          console.log('[GHL Iframe] ✅ 4b. From window.name:', urlLocationId);
        }
      } catch {
        if (typeof window.name === 'string' && window.name.length >= 15 && window.name.length <= 30 && /^[a-zA-Z0-9]+$/.test(window.name)) {
          urlLocationId = window.name;
          console.log('[GHL Iframe] ✅ 4b. window.name as plain locationId:', urlLocationId);
        }
      }
    }

    const urlUserId = urlParams.get('userId') || urlParams.get('user_id') || hashParams.get('userId') || hashParams.get('user_id');

    if (urlLocationId) {
      hasLocationIdRef.current = true;
      console.log('[GHL Iframe] ✅ APPLY from URL/path/referrer:', urlLocationId);
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
            console.log('[GHL Iframe] ✅ 5. From sessionStorage cache:', parsed.locationId);
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
      if (!hasLocationIdRef.current) {
        console.log('[GHL Iframe] Not in iframe, no locationId — setLoading(false)');
        setLoading(false);
      }
      return;
    }

    // 6. postMessage from GHL (REQUEST_USER_DATA) — matches GHL docs & MaidCentral
    console.log('[GHL Iframe] In iframe, listening for postMessage. Sending REQUEST_USER_DATA…');
    const handleMessage = (event: MessageEvent) => {
      // Log all postMessage for debugging (MaidCentral does this)
      if (event.data?.message === 'REQUEST_USER_DATA_RESPONSE' || event.data?.message) {
        console.log('[GHL Iframe] postMessage:', event.origin, event.data?.message, event.data);
      }
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
          console.log('[GHL Iframe] Received REQUEST_USER_DATA_RESPONSE, payload type:', typeof data.payload, Array.isArray(data.payload) ? `array[${data.payload.length}]` : '');
          // GHL sends encrypted string or array; extract raw encrypted data
          const rawPayload = Array.isArray(data.payload) ? data.payload[0] : data.payload;
          if (!rawPayload) {
            console.warn('[GHL Iframe] REQUEST_USER_DATA_RESPONSE has empty payload');
            return;
          }

          fetch('/api/ghl/iframe-context/decrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedData: rawPayload }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((result) => {
              console.log('[GHL Iframe] Decrypt response:', result?.success ? { success: true, locationId: result.locationId } : result);
              if (result?.success && result.locationId) {
                hasLocationIdRef.current = true;
                console.log('[GHL Iframe] ✅ 6. From decrypt (postMessage):', result.locationId);
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
                console.log('[GHL Iframe] ✅ 6b. From payload.locationId (unencrypted):', data.payload.locationId);
                apply({ locationId: data.payload.locationId, ...data.payload });
              } else if (result?.error || result?.hint) {
                console.warn('[GHL Iframe] Decrypt failed:', result?.error, result?.hint);
              }
            })
            .catch((err) => {
              console.error('[GHL Iframe] Decrypt fetch error:', err);
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
          console.log('[GHL Iframe] ✅ 6c. From other postMessage:', locationId, 'keys:', Object.keys(data));
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
          console.error('[GHL Iframe] ❌ TIMEOUT: No locationId after 6s. Check logs above for which step failed.');
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
