/**
 * Convert a polygon (array of [lat, lng]) to a KML string for download.
 * KML uses lon,lat,0 for coordinates. Output is valid for Google My Maps import.
 */

export type PolygonCoords = Array<[number, number]>;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function polygonToFragment(polygon: PolygonCoords): string {
  if (!polygon || polygon.length < 3) return '';
  const coords = polygon
    .map(([lat, lng]) => `${lng},${lat},0`)
    .join(' ');
  const closed = coords + (polygon.length > 0 ? ` ${polygon[0][1]},${polygon[0][0]},0` : '');
  return `<Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${closed}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>`;
}

/**
 * Generate a KML document string from a single polygon.
 * @param polygon - Array of [lat, lng] pairs (same format as parseKML output)
 * @param name - Placemark name (optional)
 * @returns KML string
 */
export function polygonToKML(polygon: PolygonCoords, name?: string): string {
  if (!polygon || polygon.length < 3) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document></Document></kml>';
  }
  const nameEl = name ? `<name>${escapeXml(name)}</name>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      ${nameEl}
      ${polygonToFragment(polygon)}
    </Placemark>
  </Document>
</kml>`;
}

/**
 * Generate a KML document string from multiple polygons (MultiGeometry).
 * @param polygons - Array of polygons (each is [lat, lng] pairs)
 * @param name - Placemark name (optional)
 * @returns KML string
 */
export function polygonsToKML(polygons: PolygonCoords[], name?: string): string {
  const valid = polygons.filter((p) => p && p.length >= 3);
  if (valid.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document></Document></kml>';
  }
  const nameEl = name ? `<name>${escapeXml(name)}</name>` : '';
  const fragments = valid.map(polygonToFragment).join('\n      ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      ${nameEl}
      <MultiGeometry>
      ${fragments}
    </MultiGeometry>
    </Placemark>
  </Document>
</kml>`;
}
