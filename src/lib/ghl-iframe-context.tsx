'use client';

/**
 * GHL Iframe Context — see GHL_IFRAME_APP_AUTH.md.
 * Resolves locationId from URL, path, referrer, window.name, session cache, postMessage (REQUEST_USER_DATA) + decrypt.
 */

import { useEffect, useState, createContext, useContext, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { GHLIframeData } from './ghl-iframe-types';
import { GHL_APP_VERSION_ID } from './ghl/oauth-utils';
import { LoadingDots } from '@/components/ui/loading-dots';

/** Page keys from GHL sidebar submenu → dashboard paths. Must match ghl-agency-master.js MENU_ITEMS and custom-page-link ALLOWED_PATHS. */
const CLEANQUOTE_PAGE_KEY_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  inbox: '/dashboard/crm/inbox',
  contacts: '/dashboard/crm/contacts',
  leads: '/dashboard/crm',
  quotes: '/dashboard/quotes',
  tools: '/dashboard/tools',
  'service-areas': '/dashboard/service-areas',
  pricing: '/dashboard/pricing-structures',
  settings: '/dashboard/settings',
};

/** Map pathname to sidebar page key so parent can highlight active submenu. */
function pathnameToPageKey(pathname: string): string | null {
  const p = (pathname || '').replace(/\/$/, '') || '/';
  if (p === '/dashboard') return 'dashboard';
  if (p.startsWith('/dashboard/crm/inbox')) return 'inbox';
  if (p.startsWith('/dashboard/crm/contacts')) return 'contacts';
  if (p.startsWith('/dashboard/crm')) return 'leads';
  if (p.startsWith('/dashboard/quotes')) return 'quotes';
  if (p.startsWith('/dashboard/tools')) return 'tools';
  if (p.startsWith('/dashboard/service-areas')) return 'service-areas';
  if (p.startsWith('/dashboard/pricing-structures')) return 'pricing';
  if (p.startsWith('/dashboard/settings')) return 'settings';
  return null;
}

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

/**
 * Resolve locationId from iframe context or session. Use for all GHL API calls app-wide.
 * May be null while loading or when not in GHL iframe — guard with optional chaining, early return, or loading state.
 */
export function useEffectiveLocationId(): string | null {
  return useContext(GHLIframeContext).effectiveLocationId;
}

/**
 * Full user context (locationId) for the entire app.
 * May be null when effectiveLocationId is not yet available — guard before reading .locationId.
 */
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

const DASHBOARD_ORIGIN = 'https://my.cleanquote.io';

/** Derive locationId from URL on first render so dashboard API requests have it before any useEffect runs (avoids production first-paint requests without locationId). */
function getLocationIdFromUrl(): string | null {
  if (typeof window === 'undefined' || window.self === window.top) return null;
  const pathname = window.location.pathname ?? '';
  const fromQuery = new URLSearchParams(window.location.search ?? '').get('locationId')?.trim() || null;
  const pathMatch = pathname.match(/^\/v2\/location\/([^/]+)/);
  const fromPath = pathMatch?.[1]?.trim() || null;
  return fromQuery || fromPath || null;
}

export function GHLIframeProvider({ children }: { children: React.ReactNode }) {
  const [ghlData, setGhlData] = useState<GHLIframeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** In iframe only: set when REQUEST_USER_DATA_RESPONSE (decrypt) or sessionStorage from that. Never use locationId outside iframe. */
  const [locationIdFromPostMessage, setLocationIdFromPostMessage] = useState<string | null>(null);
  /** Synchronous URL-derived locationId so first paint has locationId when path is /v2/location/XXX (production iframe). */
  const [urlDerivedLocationId] = useState<string | null>(getLocationIdFromUrl);
  const hasLocationIdRef = useRef(false);
  const postMessageResponseHandledRef = useRef(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  // LocationId: postMessage/session first; then URL-derived so first render in iframe has it when path contains /v2/location/XXX.
  const effectiveLocationId = isInIframe ? (locationIdFromPostMessage ?? ghlData?.locationId ?? urlDerivedLocationId ?? null) : null;
  const userContext: GHLUserContext | null = effectiveLocationId ? { locationId: effectiveLocationId } : null;
  const router = useRouter();
  const pathname = usePathname() ?? '';

  // Tell parent which CleanQuote submenu item is active (so sidebar can highlight it). Run on pathname change and when in iframe.
  useEffect(() => {
    if (!isInIframe || typeof window === 'undefined') return;
    const pageKey = pathnameToPageKey(pathname);
    if (pageKey) {
      try {
        window.parent.postMessage({ type: 'CLEANQUOTE_PAGE_CHANGED', page: pageKey }, '*');
      } catch {
        /* ignore */
      }
    }
  }, [isInIframe, pathname]);

  // GHL sidebar: when parent already has our custom page open, it sends CLEANQUOTE_SWITCH_PAGE so we switch in-app (no full reload).
  useEffect(() => {
    if (!isInIframe || typeof window === 'undefined') return;
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = event.data && typeof event.data === 'object' ? event.data : null;
      if (data?.type !== 'CLEANQUOTE_SWITCH_PAGE' || typeof data.page !== 'string') return;
      const pageKey = data.page.trim().toLowerCase();
      const path = CLEANQUOTE_PAGE_KEY_TO_PATH[pageKey];
      if (!path) return;
      const parts: string[] = [];
      if (effectiveLocationId) parts.push(`locationId=${encodeURIComponent(effectiveLocationId)}`);
      if (typeof window !== 'undefined' && window.sessionStorage?.getItem('cleanquote_indash') === 'true')
        parts.push('indash=true');
      const q = parts.length ? '?' + parts.join('&') : '';
      router.push(path + q);
      try {
        window.parent.postMessage({ type: 'CLEANQUOTE_PAGE_CHANGED', page: pageKey }, '*');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isInIframe, effectiveLocationId, router]);

  // Security: dashboard must only load inside GHL iframe. If opened directly (no iframe), redirect to my.cleanquote.io.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.self !== window.top) return;
    const pathname = window.location.pathname ?? '';
    if (pathname.startsWith('/dashboard')) {
      window.location.replace(DASHBOARD_ORIGIN);
    }
  }, []);

  // Set cookie so server-rendered dashboard pages (e.g. tool detail) can read locationId without session.
  useEffect(() => {
    if (typeof document === 'undefined' || !effectiveLocationId) return;
    const maxAge = 60 * 60 * 24; // 24h
    document.cookie = `ghl_location_id=${encodeURIComponent(effectiveLocationId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, [effectiveLocationId]);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    const apply = (ctx: GHLIframeData) => setGHLContext(ctx, setGhlData, setError, setLoading);

    console.log('[CQ Iframe] context resolution start', { isInIframe, pathname: typeof window !== 'undefined' ? window.location.pathname : '', hasReferrer: !!(typeof document !== 'undefined' && document.referrer) });

    // LocationId is ONLY used in iframe (from postMessage decrypt or sessionStorage set from that). Never from URL/session/cookie.
    // 5. Session cache. Iframe only: sessionStorage is only ever written by setGHLContext from postMessage (decrypt).
    if (!hasLocationIdRef.current && typeof window !== 'undefined' && isInIframe) {
      const cached = sessionStorage.getItem('ghl_iframeData');
      const cachedId = sessionStorage.getItem('ghl_locationId');
      const locationIdToUse = (() => {
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as GHLIframeData;
            if (parsed.locationId) return { id: parsed.locationId, data: parsed };
          } catch {
            /* ignore */
          }
        }
        if (cachedId && cachedId.trim()) return { id: cachedId.trim(), data: { locationId: cachedId.trim() } };
        return null;
      })();
      if (locationIdToUse) {
        hasLocationIdRef.current = true;
        console.log('[CQ Iframe] locationId from sessionStorage (from previous decrypt)');
        if (locationIdToUse.data && 'locationId' in locationIdToUse.data) {
          setGhlData(locationIdToUse.data as GHLIframeData);
        }
        setLocationIdFromPostMessage(locationIdToUse.id);
        setError(null);
        setLoading(false);
      }
    }

    // Fallback: when in iframe and still no locationId, use URL (query ?locationId= or path /v2/location/XXX/) so Quotes/Leads load reliably when opened via GHL custom link.
    if (!hasLocationIdRef.current && typeof window !== 'undefined' && isInIframe) {
      const pathname = window.location.pathname ?? '';
      const search = window.location.search ?? '';
      const urlLocationId = new URLSearchParams(search).get('locationId')?.trim() || null;
      const pathMatch = pathname.match(/^\/v2\/location\/([^/]+)/);
      const pathLocationId = pathMatch?.[1]?.trim() || null;
      const fromUrl = urlLocationId || pathLocationId;
      if (fromUrl) {
        hasLocationIdRef.current = true;
        const ctx: GHLIframeData = { locationId: fromUrl };
        setGhlData(ctx);
        setLocationIdFromPostMessage(fromUrl);
        setError(null);
        setLoading(false);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ghl_locationId', fromUrl);
          sessionStorage.setItem('ghl_iframeData', JSON.stringify(ctx));
          fetch('/api/ghl/iframe-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ctx) }).catch(() => {});
        }
      }
    }

    if (!isInIframe) {
      setLoading(false);
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
          // GHL sends encrypted string or array; extract raw encrypted data. Local test page sends plain { locationId }.
          const rawPayload = Array.isArray(data.payload) ? data.payload[0] : data.payload;
          if (!rawPayload) {
            console.warn('[GHL Iframe] REQUEST_USER_DATA_RESPONSE has empty payload');
            return;
          }
          const plainPayload = typeof rawPayload === 'object' && rawPayload !== null ? (rawPayload as Record<string, unknown>) : null;
          const plainId = typeof plainPayload?.locationId === 'string' ? plainPayload.locationId.trim() : '';
          if (plainId) {
            hasLocationIdRef.current = true;
            console.log('[CQ Iframe] ✅ Plain payload locationId (local test)', { locationId: String(plainId).slice(0, 12) + '...' });
            setLocationIdFromPostMessage(plainId as string);
            apply({
              locationId: plainId as string,
              ...(typeof rawPayload === 'object' && rawPayload !== null ? (rawPayload as Record<string, unknown>) : {}),
            });
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
                setLocationIdFromPostMessage(result.locationId);
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
                setLocationIdFromPostMessage(data.payload.locationId);
                apply({ locationId: data.payload.locationId, ...data.payload });
              } else if (result?.error || result?.hint) {
                console.warn('[GHL Iframe] Decrypt failed:', result?.error, result?.hint);
              }
            })
            .catch((err) => {
              console.error('[GHL Iframe] Decrypt fetch error:', err);
              if (typeof data.payload === 'object' && data.payload?.locationId) {
                hasLocationIdRef.current = true;
                setLocationIdFromPostMessage(data.payload.locationId);
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
          setLocationIdFromPostMessage(locationId);
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
            'No GHL user context received. You must be logged into GoHighLevel and open CleanQuote from your location. ' +
            '(1) Open from a sub-account/location dashboard, not Agency view. ' +
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

  // Gate dashboard so it only renders when we have a locationId (avoids first-click race on Quotes etc.)
  // Defer blocking UI until after mount so server and first client paint both render children (avoids hydration className mismatch).
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const showBlockingInIframe = hasMounted && isInIframe && !effectiveLocationId;
  const isDashboardDirectAccess = typeof window !== 'undefined' && window.self === window.top && (window.location.pathname ?? '').startsWith('/dashboard');

  return (
    <GHLIframeContext.Provider value={{ ghlData, loading, error, effectiveLocationId, userContext }}>
      {isDashboardDirectAccess ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
          <p>Opening CleanQuote…</p>
        </div>
      ) : showBlockingInIframe ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          {error ? (
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Couldn&apos;t connect. Refresh this window or try Setup.
            </p>
          ) : (
            <LoadingDots size="lg" className="text-muted-foreground" />
          )}
        </div>
      ) : (
        children
      )}
    </GHLIframeContext.Provider>
  );
}
