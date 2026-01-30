import { NextRequest, NextResponse } from 'next/server';
import { parseKML } from '@/lib/service-area/parseKML';
import {
  storeServiceAreaPolygon,
  storeServiceAreaNetworkLink,
  deleteServiceAreaNetworkLink,
} from '@/lib/kv';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const body = await request.json();
    const kmlContent = body.kmlContent;
    if (!kmlContent || typeof kmlContent !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid KML content' }, { status: 400 });
    }

    const parsed = parseKML(kmlContent);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (parsed.networkLink) {
      const validation = await fetchAndParseNetworkKML(parsed.networkLink);
      if (validation.error) {
        return NextResponse.json(
          { error: `Failed to validate NetworkLink: ${validation.error}` },
          { status: 400 }
        );
      }
      if (!validation.polygons || validation.polygons.length === 0) {
        return NextResponse.json(
          { error: 'No polygon data found at the NetworkLink URL' },
          { status: 400 }
        );
      }
      await storeServiceAreaNetworkLink(parsed.networkLink, toolId);
      if (validation.polygons.length > 0) {
        await storeServiceAreaPolygon(validation.polygons[0], toolId);
      }
      return NextResponse.json({
        success: true,
        message: `NetworkLink stored. Current polygon has ${validation.polygons[0]?.length ?? 0} coordinates.`,
        type: 'network',
        networkLink: parsed.networkLink,
        polygonCount: validation.polygons[0]?.length ?? 0,
      });
    }

    if (parsed.polygons && parsed.polygons.length > 0) {
      const polygon = parsed.polygons[0];
      await storeServiceAreaPolygon(polygon, toolId);
      try {
        await deleteServiceAreaNetworkLink(toolId);
      } catch {
        /* no-op */
      }
      return NextResponse.json({
        success: true,
        message: `Service area polygon uploaded with ${polygon.length} coordinates.`,
        type: 'direct',
        polygonCount: polygon.length,
      });
    }

    return NextResponse.json(
      { error: 'No polygon data or NetworkLink found in KML file' },
      { status: 400 }
    );
  } catch (e) {
    console.error('POST dashboard service-area upload:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to upload service area' },
      { status: 500 }
    );
  }
}
