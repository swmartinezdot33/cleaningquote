'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: 'transparent',
      }}
    >
      <div style={{ maxWidth: '32rem', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
          Dashboard error
        </h2>
        <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
          The dashboard could not load. This is often caused by a missing environment variable (e.g. SUPABASE_SERVICE_ROLE_KEY in Vercel) or a Supabase connection issue.
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          Check your Vercel environment variables and Supabase configuration.
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#7c3aed',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
