import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import {
  getGHLToken,
  getGHLLocationId,
  storeGHLToken,
  storeGHLLocationId,
  ghlTokenExists,
} from '@/lib/kv';
import { testGHLConnection } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const exists = await ghlTokenExists(toolId).catch(() => false);
    if (!exists) {
      return NextResponse.json({ configured: false, message: 'HighLevel API token not configured' });
    }
    const [token, locationId] = await Promise.all([
      getGHLToken(toolId),
      getGHLLocationId(toolId).catch(() => null),
    ]);
    const testResult = await testGHLConnection(token ?? undefined, {
      toolId,
      ...(locationId && { locationId }),
    }).catch(() => ({ success: false }));
    return NextResponse.json({
      configured: true,
      connected: testResult.success,
      maskedToken: token ? `****${token.slice(-4)}` : 'Unknown',
      locationId,
      status: testResult.success ? 'Connected' : 'Not Connected',
    });
  } catch (e) {
    console.error('GET dashboard ghl-settings:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get GHL settings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const body = await request.json();
    const { token, locationId } = body;
    const handlerHeaders = { 'X-Response-Handler': 'dashboard-ghl-settings' };
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400, headers: handlerHeaders });
    }
    if (token.length < 20) {
      return NextResponse.json({ error: 'Token appears to be invalid (too short)' }, { status: 400, headers: handlerHeaders });
    }
    if (!locationId || typeof locationId !== 'string' || !locationId.trim()) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400, headers: handlerHeaders });
    }

    const locationIdTrimmed = locationId.trim();
    await storeGHLLocationId(locationIdTrimmed, toolId);
    // Test using the location we just saved (tool-scoped) so the test runs against the correct sub-account
    const testResult = await testGHLConnection(token, {
      toolId,
      locationId: locationIdTrimmed,
    }).catch(() => ({ success: false, error: 'Connection test failed' }));
    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Connection test failed - token was not saved',
          details: ('error' in testResult ? testResult.error : undefined) ?? 'Check your token and required scopes (e.g. contacts.readonly or contacts.write).',
          _handler: 'dashboard-ghl-settings',
        },
        { status: 400, headers: handlerHeaders }
      );
    }
    await storeGHLToken(token, toolId);
    const json = {
      success: true,
      message: 'GHL API token saved successfully',
      configured: true,
      connected: true,
      _handler: 'dashboard-ghl-settings' as const,
    };
    return NextResponse.json(json, {
      headers: { 'X-Response-Handler': 'dashboard-ghl-settings' },
    });
  } catch (e) {
    console.error('POST dashboard ghl-settings:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save HighLevel token' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const exists = await ghlTokenExists(toolId).catch(() => false);
    if (!exists) {
      return NextResponse.json({ error: 'GHL token not configured' }, { status: 400 });
    }
    const [token, locationId] = await Promise.all([
      getGHLToken(toolId),
      getGHLLocationId(toolId).catch(() => null),
    ]);
    const testResult = await testGHLConnection(token ?? undefined, {
      toolId,
      ...(locationId && { locationId }),
    }).catch(() => ({ success: false }));
    return NextResponse.json({
      success: testResult.success,
      connected: testResult.success,
      message: testResult.success ? 'Connected to HighLevel successfully' : (('error' in testResult ? testResult.error : undefined) ?? 'Failed to connect'),
      error: 'error' in testResult ? testResult.error : undefined,
    });
  } catch (e) {
    console.error('PUT dashboard ghl-settings (test):', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to test connection' },
      { status: 500 }
    );
  }
}
