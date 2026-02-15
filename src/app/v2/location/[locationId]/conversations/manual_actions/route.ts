import { NextResponse } from 'next/server';

/**
 * GET /v2/location/{locationId}/conversations/manual_actions
 * Stub for GHL Conversations UI when loaded on CleanQuote origin (e.g. iframe/embed).
 * GHL's frontend requests this; we don't implement manual actions, so return an empty list
 * to avoid 404 and allow the Conversations UI to continue.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  await context.params;
  return NextResponse.json([], { status: 200 });
}
