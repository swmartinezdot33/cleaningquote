/**
 * Parse CSV text to a list of US 5-digit ZIP codes and fetch ZCTA polygon boundaries.
 * Uses Census Bureau TIGERweb REST API (free, no key required).
 */

import type { PolygonCoordinates } from './pointInPolygon';

const CENSUS_ZCTA_QUERY =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/84/query';

/** US 5-digit ZIP pattern (optionally strip +4). */
const ZIP5_REGEX = /\b(\d{5})(?:-\d{4})?\b/g;

/**
 * Extract unique 5-digit ZIP codes from CSV (or any) text.
 * Looks for columns or cells that match US ZIP format.
 */
export function parseCsvToZipCodes(csvText: string): string[] {
  const seen = new Set<string>();
  const zips: string[] = [];
  const matches = csvText.matchAll(ZIP5_REGEX);
  for (const m of matches) {
    const zip5 = m[1];
    if (!seen.has(zip5)) {
      seen.add(zip5);
      zips.push(zip5);
    }
  }
  return zips;
}

/**
 * Fetch one ZCTA polygon from Census TIGERweb.
 * Returns polygon as [lat, lng][] or null if not found / error.
 */
export async function fetchZctaPolygon(zip5: string): Promise<PolygonCoordinates | null> {
  const params = new URLSearchParams({
    where: `GEOID='${zip5}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  const url = `${CENSUS_ZCTA_QUERY}?${params.toString()}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const geojson = (await res.json()) as {
      type: string;
      features?: Array<{
        geometry?: { type: string; coordinates?: number[][][] | number[][][][] };
      }>;
    };
    if (geojson.type !== 'FeatureCollection' || !geojson.features?.length) return null;
    const feat = geojson.features[0];
    const geom = feat?.geometry;
    if (!geom?.coordinates) return null;
    // GeoJSON: [lng, lat]. We need [lat, lng]. Handle Polygon (rings) or MultiPolygon (polygons → rings).
    const rings: number[][][] = geom.type === 'MultiPolygon' ? (geom.coordinates as number[][][][])[0] : (geom.coordinates as number[][][]);
    const outer: number[][] = rings[0] ?? [];
    if (!outer.length) return null;
    const polygon: PolygonCoordinates = outer.map(([lng, lat]) => [lat, lng]);
    if (polygon.length < 3) return null;
    // Close ring if not closed
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) polygon.push([first[0], first[1]]);
    return polygon;
  } catch {
    return null;
  }
}

export interface ZipCodesToPolygonsResult {
  polygons: PolygonCoordinates[];
  labels: string[]; // one per polygon (zip code)
  failed: string[]; // zips that could not be fetched
}

/**
 * Convert a list of ZIP codes to ZCTA polygons via Census TIGERweb.
 * Returns polygons and labels (zip codes). Failed zips are listed in failed.
 */
export async function zipCodesToPolygons(zipCodes: string[]): Promise<ZipCodesToPolygonsResult> {
  const polygons: PolygonCoordinates[] = [];
  const labels: string[] = [];
  const failed: string[] = [];
  const normalized = [...new Set(zipCodes.map((z) => z.trim().replace(/^(\d{5}).*/, '$1')))].filter((z) => /^\d{5}$/.test(z));
  for (const zip5 of normalized) {
    const poly = await fetchZctaPolygon(zip5);
    if (poly) {
      polygons.push(poly);
      labels.push(zip5);
    } else {
      failed.push(zip5);
    }
  }
  return { polygons, labels, failed };
}
