/**
 * Returns current dashboard session context.
 * For marketplace (OAuth) users: { mode: 'ghl', locationId }.
 * For Supabase users: 401 (use org/tool APIs).
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }
  return NextResponse.json({
    mode: 'ghl',
    locationId: session.locationId,
    companyId: session.companyId,
    userId: session.userId,
  });
}
