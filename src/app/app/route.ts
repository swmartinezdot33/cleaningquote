/**
 * App Launch URL — use /dashboard as Live URL instead (recommended).
 * This route: if already connected (GHL session), go to dashboard. Otherwise OAuth install.
 * Set Live URL to https://cleanquote.io/dashboard so returning users go straight in.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, GHL_SESSION_COOKIE } from '@/lib/ghl/session';

const CHOOSELOCATION_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const DEFAULT_SCOPE =
  'calendars/groups.write calendars/resources.readonly calendars/resources.write conversations.readonly campaigns.readonly conversations.write calendars/events.write calendars/groups.readonly calendars/events.readonly calendars.write calendars.readonly companies.readonly businesses.write businesses.readonly conversations/message.readonly conversations/message.write conversations/reports.readonly conversations/livechat.write contacts.readonly contacts.write objects/schema.readonly objects/schema.write objects/record.write objects/record.readonly associations.write associations.readonly associations/relation.readonly associations/relation.write locations.write locations.readonly locations/customValues.readonly locations/customFields.readonly locations/customValues.write locations/customFields.write locations/tags.readonly locations/tags.write locations/templates.readonly opportunities.readonly opportunities.write oauth.readonly oauth.write';

export async function GET(request: NextRequest) {
  // Already connected? Go to dashboard (OAuth only needed once per location)
  const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI?.trim();
  const scope = process.env.GHL_SCOPE || DEFAULT_SCOPE;
  const versionId = process.env.GHL_VERSION_ID || (clientId?.includes('-') ? clientId.split('-')[0] : undefined);
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL('/login?error=server_config&message=OAuth+not+configured', request.url)
    );
  }

  const state = new URLSearchParams();
  state.set('redirect', redirectTo);

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: clientId,
    scope: scope.replace(/\s+/g, ' ').trim(),
    state: state.toString(),
  });
  if (versionId) params.set('version_id', versionId);

  return NextResponse.redirect(`${CHOOSELOCATION_URL}?${params.toString()}`);
}
