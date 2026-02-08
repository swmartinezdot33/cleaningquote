import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import {
  getGHLTokenForOrg,
  getGHLLocationIdForOrg,
  getOrgGHLUseOAuth,
  setOrgGHL,
  clearOrgGHL,
} from '@/lib/config/store';
import { testGHLConnection } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** GET - Org-level HighLevel connection status (1 org = 1 HL integration). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can view HighLevel settings' }, { status: 403 });
  }

  try {
    const [token, locationId, useOauth] = await Promise.all([
      getGHLTokenForOrg(orgId),
      getGHLLocationIdForOrg(orgId),
      getOrgGHLUseOAuth(orgId),
    ]);
    if (!token || !locationId) {
      return NextResponse.json({
        configured: false,
        message: 'Connect with HighLevel to link your sub-account.',
      });
    }
    const testResult = await testGHLConnection(token, { locationId }).catch(() => ({ success: false }));
    return NextResponse.json({
      configured: true,
      connected: testResult.success,
      useOauth,
      maskedToken: token ? `****${token.slice(-4)}` : 'Unknown',
      locationId,
      status: testResult.success ? 'Connected' : 'Not Connected',
    });
  } catch (e) {
    console.error('GET org ghl-settings:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get GHL settings' },
      { status: 500 }
    );
  }
}

/** POST - Save org-level HighLevel token and location ID. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ghl-settings/route.ts:POST',message:'auth check',data:{orgId,hasUser:!!user,canManage},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can save HighLevel settings' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { token, locationId } = body;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ghl-settings/route.ts:POST',message:'body parsed',data:{hasToken:!!token,tokenType:typeof token,hasLocationId:!!locationId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }
    if (token.length < 20) {
      return NextResponse.json({ error: 'Token appears to be invalid (too short)' }, { status: 400 });
    }
    if (!locationId || typeof locationId !== 'string' || !locationId.trim()) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const locationIdTrimmed = locationId.trim();
    const testResult = await testGHLConnection(token, { locationId: locationIdTrimmed }).catch(() => ({
      success: false,
      error: 'Connection test failed',
    }));
    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Connection test failed - token was not saved',
          details: ('error' in testResult ? testResult.error : undefined) ?? 'Check your token and required scopes.',
        },
        { status: 400 }
      );
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ghl-settings/route.ts:POST',message:'before setOrgGHL',data:{orgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    await setOrgGHL(orgId, token, locationIdTrimmed);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ghl-settings/route.ts:POST',message:'after setOrgGHL',data:{orgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({
      success: true,
      message: 'HighLevel connection saved for this organization. All tools in this org will use it.',
      configured: true,
      connected: true,
      locationId: locationIdTrimmed,
    });
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ghl-settings/route.ts:POST',message:'catch',data:{err:String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    console.error('POST org ghl-settings:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save HighLevel connection' },
      { status: 500 }
    );
  }
}

/** PUT - Test existing org-level GHL connection. */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can test HighLevel connection' }, { status: 403 });
  }

  try {
    const [token, locationId] = await Promise.all([
      getGHLTokenForOrg(orgId),
      getGHLLocationIdForOrg(orgId),
    ]);
    if (!token || !locationId) {
      return NextResponse.json({ error: 'GHL token and Location ID not configured' }, { status: 400 });
    }
    const testResult = await testGHLConnection(token, { locationId }).catch(() => ({ success: false }));
    return NextResponse.json({
      success: testResult.success,
      connected: testResult.success,
      message: testResult.success ? 'Connected to HighLevel successfully' : (('error' in testResult ? testResult.error : undefined) ?? 'Failed to connect'),
      error: 'error' in testResult ? testResult.error : undefined,
    });
  } catch (e) {
    console.error('PUT org ghl-settings (test):', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to test connection' },
      { status: 500 }
    );
  }
}

/** DELETE - Disconnect org from HighLevel. */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can disconnect HighLevel' }, { status: 403 });
  }

  try {
    await clearOrgGHL(orgId);
    return NextResponse.json({ success: true, message: 'HighLevel disconnected.' });
  } catch (e) {
    console.error('DELETE org ghl-settings:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
