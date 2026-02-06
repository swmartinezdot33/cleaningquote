/**
 * Normalize service_areas.polygon (jsonb) to a consistent array of polygons.
 * DB can store: (1) a single polygon [[lat,lng],...] or (2) multiple polygons [ poly1, poly2, ... ].
 */

import type { PolygonCoordinates } from './pointInPolygon';

function isSinglePolygon(p: unknown): p is PolygonCoordinates {
  return (
    Array.isArray(p) &&
    p.length >= 3 &&
    Array.isArray(p[0]) &&
    p[0].length >= 2 &&
    typeof (p[0] as unknown[])[0] === 'number'
  );
}

/**
 * Return an array of polygons from stored polygon jsonb.
 * Handles legacy single-polygon and multi-polygon storage.
 */
export function normalizeServiceAreaPolygons(polygon: unknown): PolygonCoordinates[] {
  if (!polygon || !Array.isArray(polygon) || polygon.length === 0) return [];
  if (isSinglePolygon(polygon)) return [polygon];
  // Multi: array of polygons
  const out: PolygonCoordinates[] = [];
  for (const item of polygon) {
    if (isSinglePolygon(item)) out.push(item);
  }
  return out;
}

/**
 * Ensure value is stored as array of polygons (for DB insert/update).
 * Pass either a single polygon or array of polygons.
 */
export function toStoredPolygons(
  polygon: PolygonCoordinates | PolygonCoordinates[]
): PolygonCoordinates[] {
  if (!Array.isArray(polygon) || polygon.length === 0) return [];
  if (isSinglePolygon(polygon)) return [polygon];
  return polygon.filter(isSinglePolygon);
}
