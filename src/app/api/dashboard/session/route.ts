/**
 * Returns current dashboard session context (GHL-only; no Next/Supabase login).
 * When we have user context we lookup and cache current user info for reference.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchCurrentUser } from '@/lib/ghl/user-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No GHL session. Open CleanQuote from your location in GoHighLevel.' }, { status: 401 });
  }

  // When we have userId, lookup current user from GHL and cache for reference (name, email, etc.)
  let user = null;
  if (session.userId) {
    try {
      user = await getOrFetchCurrentUser(session.locationId, session.userId);
    } catch {
      // non-fatal; session still valid
    }
  }

  return NextResponse.json({
    mode: 'ghl',
    locationId: session.locationId,
    companyId: session.companyId,
    userId: session.userId,
    user,
  });
}
