'use client';

/**
 * GHL Iframe Context — see GHL_IFRAME_APP_AUTH.md.
 * Resolves locationId from URL, path, referrer, window.name, session cache, postMessage (REQUEST_USER_DATA) + decrypt.
 */

import { useEffect, useState, createContext, useContext, useRef } from 'react';
import type { GHLIframeData } from './ghl-iframe-types';
import { GHL_APP_VERSION_ID } from './ghl/oauth-utils';

export type { GHLIframeData };

/** User context: resolved locationId for API calls (iframe or session). */
export interface GHLUserContext {
  locationId: string;
}

interface GHLIframeContextType {
  ghlData: GHLIframeData | null;
  loading: boolean;
  error: string | null;
  /** Resolved locationId from iframe or session — use for all API calls app-wide. */
  effectiveLocationId: string | null;
  /** User context for the whole app (locationId when available). */
  userContext: GHLUserContext | null;
}

const GHLIframeContext = createContext<GHLIframeContextType>({
  ghlData: null,
  loading: true,
  error: null,
  effectiveLocationId: null,
  userContext: null,
});

export function useGHLIframe() {
  return useContext(GHLIframeContext);
}

/** Resolve locationId from iframe context or session. Use for all GHL API calls app-wide. */
export function useEffectiveLocationId(): string | null {
  return useContext(GHLIframeContext).effectiveLocationId;
}

/** Full user context (locationId) for the entire app. */
export function useGHLUserContext(): GHLUserContext | null {
  return useContext(GHLIframeContext).userContext;
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
      // Store on backend
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
  const [sessionLocationId, setSessionLocationId] = useState<string | null>(null);
  const hasLocationIdRef = useRef(false);
  const postMessageResponseHandledRef = useRef(false);

  // App-wide user context: when not in iframe (or before iframe resolves), use session so same-tab OAuth works.
  useEffect(() => {
    if (ghlData?.locationId) return;
    fetch('/api/dashboard/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.locationId) setSessionLocationId(data.locationId);
      })
      .catch(() => {});
  }, [ghlData?.locationId]);

  const effectiveLocationId = ghlData?.locationId ?? sessionLocationId;
  const userContext: GHLUserContext | null = effectiveLocationId ? { locationId: effectiveLocationId } : null;

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    const apply = (ctx: GHLIframeData) => setGHLContext(ctx, setGhlData, setError, setLoading);

    console.log('[CQ Iframe] context resolution start', { isInIframe, pathname: typeof window !== 'undefined' ? window.location.pathname : '', hasReferrer: !!(typeof document !== 'undefined' && document.referrer) });

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

    // 2. From current URL path (/location/{id}/) — skip if id is our app version_id (GHL sometimes puts that in the path instead of real locationId)
    if (!urlLocationId) {
      const pathMatch = pathname.match(/\/location\/([^/]+)/i);
      if (pathMatch?.[1] && pathMatch[1] !== GHL_APP_VERSION_ID) {
        urlLocationId = pathMatch[1];
        console.log('[GHL Iframe] ✅ 2. From path:', urlLocationId);
      }
    }

    // 3. From iframe src path (v1/v2/location/xxx) — same: ignore version_id so session/postMessage provide real locationId
    if (!urlLocationId && isInIframe) {
      const iframePathMatch = pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
      if (iframePathMatch?.[1] && iframePathMatch[1] !== GHL_APP_VERSION_ID) {
        urlLocationId = iframePathMatch[1];
        console.log('[GHL Iframe] ✅ 3a. From iframe path (vN/location/xxx):', urlLocationId);
      }
      if (!urlLocationId) {
        const parts = pathname.split('/');
        const id = parts.find((p) => p.length >= 15 && p.length <= 30 && /^[a-zA-Z0-9]+$/.test(p) && p !== GHL_APP_VERSION_ID);
        if (id) {
          urlLocationId = id;
          console.log('[GHL Iframe] ✅ 3b. From path parts (potential id):', urlLocationId);
        }
      }
    }

    // 4. Referrer (GHL parent) — reliable for custom menu links; ignore version_id
    if (!urlLocationId && typeof document !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        console.log('[GHL Iframe] 4. Referrer hostname:', referrerUrl.hostname, 'pathname:', referrerUrl.pathname);
        if (/gohighlevel|leadconnector|cleanquote\.io|ricochetbusinesssolutions/i.test(referrerUrl.hostname)) {
          const refMatch = referrerUrl.pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
          const refId = refMatch?.[1] ?? referrerUrl.searchParams.get('locationId') ?? referrerUrl.searchParams.get('location_id') ?? null;
          if (refId && refId !== GHL_APP_VERSION_ID) urlLocationId = refId;
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

    // 4b. window.name
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
      console.log('[CQ Iframe] locationId resolved (URL/path/referrer)', { locationId: urlLocationId.slice(0, 12) + '...' });
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
            console.log('[CQ Iframe] locationId from sessionStorage cache');
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
        console.log('[CQ Iframe] not in iframe, no locationId');
        setLoading(false);
      }
      return;
    }

    console.log('[CQ Iframe] in iframe: sending REQUEST_USER_DATA, waiting for postMessage');
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
          // Only process once per resolution run; always apply so current page context wins over stale sessionStorage
          if (postMessageResponseHandledRef.current) return;
          postMessageResponseHandledRef.current = true;
          console.log('[CQ Iframe] REQUEST_USER_DATA_RESPONSE received');
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
              if (result?.success && result.locationId) {
                hasLocationIdRef.current = true;
                console.log('[CQ Iframe] locationId from decrypt (postMessage)', { locationId: result.locationId?.slice(0, 12) + '...' });
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
      // Send REQUEST_USER_DATA per GHL docs; retry for slow-loading parent.
      // Include origin so GHL can use event.source.postMessage(response, event.origin) to reply to this iframe.
      // Works with both: (1) GHL replying to iframe via event.source, (2) no postMessage → we use URL/sessionStorage fallbacks.
      const targetOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const sendRequest = () => {
        window.parent.postMessage({ message: 'REQUEST_USER_DATA', origin: targetOrigin }, '*');
        if (window.top && window.top !== window) {
          try {
            window.top.postMessage({ message: 'REQUEST_USER_DATA', origin: targetOrigin }, '*');
          } catch {
            /* same-origin only */
          }
        }
      };
      sendRequest();
      const t1 = setTimeout(sendRequest, 100);
      const t2 = setTimeout(sendRequest, 500);
      const t3 = setTimeout(sendRequest, 1000);
      const t4 = setTimeout(sendRequest, 2000);
      const t5 = setTimeout(sendRequest, 4000);
      const t6 = setTimeout(() => {
        if (!hasLocationIdRef.current) {
          console.error('[CQ Iframe] TIMEOUT: no locationId after 6s');
          setError(
            'No GHL user context received. (1) Open from a sub-account/location dashboard, not Agency view. ' +
            '(2) If using Custom Menu Link, add sessionKey to the URL for white-label. ' +
            '(3) Ensure GHL_APP_SSO_KEY matches your CleanQuote Shared Secret in Marketplace App → Auth.'
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
    <GHLIframeContext.Provider value={{ ghlData, loading, error, effectiveLocationId, userContext }}>
      {children}
    </GHLIframeContext.Provider>
  );
}
