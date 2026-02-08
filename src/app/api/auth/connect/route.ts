/**
 * Redirect to GHL OAuth chooselocation.
 * Used for org-level GHL connection from Settings.
 * Pass orgId in state so callback can link location to org.
 */

import { NextRequest, NextResponse } from 'next/server';

const CHOOSELOCATION_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';

// Scopes needed for quote flow, CRM, calendars, contacts, opportunities, custom objects, etc.
const DEFAULT_SCOPE =
  'calendars/groups.write calendars/resources.readonly calendars/resources.write conversations.readonly campaigns.readonly conversations.write calendars/events.write calendars/groups.readonly calendars/events.readonly calendars.write calendars.readonly companies.readonly businesses.write businesses.readonly conversations/message.readonly conversations/message.write conversations/reports.readonly conversations/livechat.write contacts.readonly contacts.write objects/schema.readonly objects/schema.write objects/record.write objects/record.readonly associations.write associations.readonly associations/relation.readonly associations/relation.write locations.write locations.readonly locations/customValues.readonly locations/customFields.readonly locations/customValues.write locations/customFields.write locations/tags.readonly locations/tags.write locations/templates.readonly opportunities.readonly opportunities.write oauth.readonly oauth.write';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI?.trim();
  const scope = process.env.GHL_SCOPE || DEFAULT_SCOPE;
  const versionId = process.env.GHL_VERSION_ID || (clientId?.includes('-') ? clientId.split('-')[0] : undefined);

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'GHL OAuth not configured. Set GHL_CLIENT_ID and GHL_REDIRECT_URI.' },
      { status: 500 }
    );
  }

  // state: pass through orgId and redirect for callback
  const state = new URLSearchParams();
  if (orgId) state.set('orgId', orgId);
  state.set('redirect', redirectTo);

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: clientId,
    scope: scope.replace(/\s+/g, ' ').trim(),
    state: state.toString(),
  });
  if (versionId) params.set('version_id', versionId);

  const url = `${CHOOSELOCATION_URL}?${params.toString()}`;
  return NextResponse.redirect(url);
}
