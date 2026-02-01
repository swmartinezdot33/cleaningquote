import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const NATIVE_FIELDS = [
  { key: 'firstName', name: 'First Name', type: 'native' },
  { key: 'lastName', name: 'Last Name', type: 'native' },
  { key: 'email', name: 'Email', type: 'native' },
  { key: 'phone', name: 'Phone', type: 'native' },
];

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  const model = (req.nextUrl.searchParams.get('model') || 'contact').toLowerCase();
  const allowedModel = model === 'opportunity' ? 'opportunity' : 'contact';

  try {
    const token = await getGHLToken(toolId);
    if (!token) {
      return NextResponse.json({ error: 'HighLevel token not configured', fields: NATIVE_FIELDS }, { status: 400 });
    }
    const locationId = await getGHLLocationId(toolId);
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required', fields: NATIVE_FIELDS }, { status: 400 });
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=${allowedModel}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const fallbackFields = allowedModel === 'opportunity' ? [] : NATIVE_FIELDS;
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return NextResponse.json({ fields: fallbackFields });
      }
      return NextResponse.json({ error: 'Failed to fetch custom fields', fields: fallbackFields }, { status: res.status });
    }

    const data = await res.json();
    const raw = data.customFields ?? data.fields ?? data.data ?? (Array.isArray(data) ? data : []);
    const list = Array.isArray(raw) ? raw : [];
    const valid = list.filter(
      (f: { key?: string; name?: string }) => f && typeof (f.key ?? f.name) === 'string' && String((f.key ?? f.name) as string).trim() !== ''
    );
    const defaultFields = allowedModel === 'opportunity' ? [] : NATIVE_FIELDS;
    const fields = valid.length > 0
      ? valid.map((f: { key?: string; name?: string; type?: string; fieldType?: string }) => ({
          key: (f.key ?? f.name ?? '').trim(),
          name: (f.name ?? f.key ?? 'Unknown').trim(),
          type: f.type ?? 'custom',
          fieldType: f.fieldType,
        }))
      : defaultFields;
    return NextResponse.json({ fields });
  } catch (e) {
    console.error('GET dashboard ghl-custom-fields:', e);
    const fallbackFields = allowedModel === 'opportunity' ? [] : NATIVE_FIELDS;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch fields', fields: fallbackFields },
      { status: 500 }
    );
  }
}
