'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/dashboard/crm', label: 'Leads' },
  { value: '/dashboard/quotes', label: 'Quotes' },
  { value: '/dashboard/crm/contacts', label: 'Contacts' },
  { value: '/dashboard/tools', label: 'Tools' },
  { value: '/dashboard/service-areas', label: 'Service Areas' },
  { value: '/dashboard/pricing-structures', label: 'Pricing' },
];

export default function GHLIframeAuthTestPage() {
  const [base, setBase] = useState('http://localhost:3000');
  const [locationId, setLocationId] = useState('');
  const [path, setPath] = useState('/dashboard');
  const [showFrame, setShowFrame] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setBase(window.location.origin);
  }, []);

  const sendPostMessage = useCallback(() => {
    const id = locationId.trim();
    const origin = base.replace(/\/$/, '');
    const iframe = iframeRef.current;
    if (!id || !iframe?.contentWindow) return;
    try {
      const msg = { message: 'REQUEST_USER_DATA_RESPONSE', payload: { locationId: id } };
      iframe.contentWindow.postMessage(msg, origin);
      console.log('[ghlIframeAuth] postMessage sent', { origin, locationId: id.slice(0, 8) + '...' });
    } catch (e) {
      console.warn('[ghlIframeAuth] postMessage error', e);
    }
  }, [base, locationId]);

  useEffect(() => {
    if (!showFrame || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const onLoad = () => {
      sendPostMessage();
      setTimeout(sendPostMessage, 200);
      setTimeout(sendPostMessage, 600);
    };
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') onLoad();
    return () => iframe.removeEventListener('load', onLoad);
  }, [showFrame, sendPostMessage]);

  const loadIframe = () => {
    const id = locationId.trim();
    if (!id) {
      alert('Enter a Location ID');
      return;
    }
    setShowFrame(true);
  };

  const iframeUrl = `${base.replace(/\/$/, '')}${path}`;

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-[920px] mx-auto space-y-5">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Local iframe test</h1>
          <p className="text-sm text-gray-600 mb-4">
            Test CleanQuote locally by <strong>mimicking postMessage</strong>: the app loads in an iframe with{' '}
            <em>no</em> URL params. This page sends a postMessage with the location ID so the app receives context the same way as in production.
          </p>
          <label className="block text-sm font-semibold text-gray-900 mb-1">App base URL</label>
          <input
            type="text"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
          />
          <label className="block text-sm font-semibold text-gray-900 mb-1">Location ID</label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="e.g. tCqS9npFPtO0DSuYVvzb"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-1"
          />
          <p className="text-xs text-gray-500 mb-4">Your sub-account location ID (case-sensitive).</p>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Initial page</label>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
          >
            {PAGES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadIframe}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Load app in iframe + send postMessage
          </button>
          <p className="text-xs text-gray-500 mt-2 break-all">
            Iframe URL (no params): {iframeUrl} — locationId is sent via postMessage.
          </p>
        </div>

        {showFrame && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">App (iframe)</h2>
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              title="CleanQuote"
              className="w-full border border-gray-200 rounded-md bg-white"
              style={{ height: '72vh' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
