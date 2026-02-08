'use client';

import { useEffect } from 'react';

/** Logs to browser console when open-from-ghl "no session" view is shown (for live debugging). */
export function OpenFromGHLLogger() {
  useEffect(() => {
    console.log('[CQ OAuth]', `[${Date.now()}] open-from-ghl: no session → showing instructions`);
  }, []);
  return null;
}
