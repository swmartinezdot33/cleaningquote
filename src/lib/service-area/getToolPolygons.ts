/**
 * Load polygons for a single tool from its assigned org-level service areas only.
 * Reads tool_service_areas for the given toolId, then loads each assigned area's polygon(s).
 * Multiple areas and multi-polygon areas are flattened into one list; the caller treats
 * "in service" as: point is inside ANY of these polygons.
 * Refreshes network-link areas if stale. Returns null if no assignments (caller falls back to tool_config).
 */

import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { normalizeServiceAreaPolygons, toStoredPolygons } from '@/lib/service-area/normalizePolygons';
import { pointInPolygon, type PolygonCoordinates } from '@/lib/service-area/pointInPolygon';

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type MatchingServiceArea = { serviceAreaId: string; pricingStructureId: string | null };

/**
 * For a tool and point, find the first assigned service area that contains the point.
 * Used to return which area matched and its pricing structure for quote calculation.
 */
export async function getMatchingServiceAreaForPoint(
  toolId: string,
  lat: number,
  lng: number
): Promise<MatchingServiceArea | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServer();
  const { data: assignments } = await supabase
    .from('tool_service_areas')
    .select('service_area_id, pricing_structure_id')
    .eq('tool_id', toolId);

  if (!assignments?.length) return null;

  const now = new Date().toISOString();

  for (const a of assignments as Array<{ service_area_id: string; pricing_structure_id: string | null }>) {
    const { data: area } = await supabase
      .from('service_areas')
      .select('id, polygon, network_link_url, network_link_fetched_at')
      .eq('id', a.service_area_id)
      .single();

    if (!area) continue;

    const areaRow = area as { id: string; polygon: unknown; network_link_url?: string; network_link_fetched_at?: string };
    let areaPolygons: PolygonCoordinates[] = [];
    const fetchedAt = areaRow.network_link_fetched_at
      ? new Date(areaRow.network_link_fetched_at).getTime()
      : 0;
    const isStale = !areaRow.network_link_fetched_at || Date.now() - fetchedAt > STALE_MS;
    const networkLink = areaRow.network_link_url;

    if (networkLink?.trim() && isStale) {
      try {
        const result = await fetchAndParseNetworkKML(networkLink.trim());
        if (result.polygons?.length) {
          const stored = toStoredPolygons(result.polygons);
          await supabase
            .from('service_areas')
            // @ts-expect-error Supabase Update type
            .update({
              polygon: stored as unknown as import('@/lib/supabase/types').Json,
              network_link_fetched_at: now,
              updated_at: now,
            })
            .eq('id', areaRow.id);
          areaPolygons = stored;
        }
      } catch {
        // use existing polygon
      }
    }

    if (areaPolygons.length === 0) {
      areaPolygons = normalizeServiceAreaPolygons(areaRow.polygon);
    }

    const closed = areaPolygons.map((polygon) => {
      if (polygon.length < 3) return polygon;
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      const isClosed = first[0] === last[0] && first[1] === last[1];
      return isClosed ? polygon : ([...polygon, [first[0], first[1]]] as PolygonCoordinates);
    });

    for (const polygon of closed) {
      if (polygon.length >= 3 && pointInPolygon({ lat, lng }, polygon)) {
        return {
          serviceAreaId: a.service_area_id,
          pricingStructureId: a.pricing_structure_id ?? null,
        };
      }
    }
  }

  return null;
}

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
