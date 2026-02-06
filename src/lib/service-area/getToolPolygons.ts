/**
 * Load polygons for a tool from assigned org-level service areas.
 * Refreshes network-link areas if stale. Returns null if no assignments (caller falls back to tool_config).
 */

import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { normalizeServiceAreaPolygons, toStoredPolygons } from '@/lib/service-area/normalizePolygons';
import type { PolygonCoordinates } from '@/lib/service-area/pointInPolygon';

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getToolPolygonsFromAssignedAreas(
  toolId: string
): Promise<PolygonCoordinates[] | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServer();

  const { data: assignments } = await supabase
    .from('tool_service_areas')
    .select('service_area_id')
    .eq('tool_id', toolId);

  if (!assignments?.length) return null;

  const areaIds = assignments.map((a: { service_area_id: string }) => a.service_area_id);
  const { data: areas } = await supabase
    .from('service_areas')
    .select('id, polygon, network_link_url, network_link_fetched_at')
    .in('id', areaIds);

  if (!areas?.length) return null;

  const polygons: PolygonCoordinates[] = [];
  const now = new Date().toISOString();

  for (const area of areas as Array<{
    id: string;
    polygon: unknown;
    network_link_url: string | null;
    network_link_fetched_at: string | null;
  }>) {
    let areaPolygons: PolygonCoordinates[] = [];
    const fetchedAt = area.network_link_fetched_at ? new Date(area.network_link_fetched_at).getTime() : 0;
    const isStale = !area.network_link_fetched_at || Date.now() - fetchedAt > STALE_MS;

    if (area.network_link_url && area.network_link_url.trim() && isStale) {
      try {
        const result = await fetchAndParseNetworkKML(area.network_link_url.trim());
        if (result.polygons?.length) {
          const stored = toStoredPolygons(result.polygons);
          await supabase
            .from('service_areas')
            // @ts-expect-error Supabase Update type can be never for new table
            .update({
              polygon: stored as unknown as import('@/lib/supabase/types').Json,
              network_link_fetched_at: now,
              updated_at: now,
            })
            .eq('id', area.id);
          areaPolygons = stored;
        }
      } catch {
        // Use existing polygon if fetch failed
      }
    }

    if (areaPolygons.length === 0) {
      areaPolygons = normalizeServiceAreaPolygons(area.polygon);
    }
    areaPolygons.forEach((p) => polygons.push(p));
  }

  return polygons.length > 0 ? polygons : null;
}
