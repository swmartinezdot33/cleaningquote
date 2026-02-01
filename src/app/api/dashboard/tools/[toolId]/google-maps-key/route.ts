import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getGoogleMapsKey, setGoogleMapsKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const apiKey = await getGoogleMapsKey(auth.tool.id);
    const maskedKey = apiKey
      ? apiKey.substring(0, 7) + '*'.repeat(Math.max(0, apiKey.length - 10)) + apiKey.substring(apiKey.length - 3)
      : '';
    return NextResponse.json({ exists: !!apiKey, maskedKey });
  } catch (e) {
    console.error('GET dashboard google-maps-key:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get API key' },
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

  try {
    const body = await request.json();
    const apiKey = body.apiKey;
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }
    if (apiKey.length < 30) {
      return NextResponse.json({ error: 'API key appears to be invalid (too short)' }, { status: 400 });
    }

    await setGoogleMapsKey(apiKey, auth.tool.id);
    return NextResponse.json({ success: true, message: 'Google Maps API key saved' });
  } catch (e) {
    console.error('POST dashboard google-maps-key:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    await setGoogleMapsKey(null, auth.tool.id);
    return NextResponse.json({ success: true, message: 'Google Maps API key removed' });
  } catch (e) {
    console.error('DELETE dashboard google-maps-key:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
