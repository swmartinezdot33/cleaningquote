'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              CleanQuote.io
            </h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Something went wrong
            </h2>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>
              The app could not load. Try refreshing or go back to the home page.
            </p>
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: '#94a3b8',
                wordBreak: 'break-all',
              }}
              title={error.message}
            >
              {error.message}
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.625rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  color: '#0d9488',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.625rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
