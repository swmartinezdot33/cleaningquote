/**
 * KML Parser for extracting polygon coordinates from KML files
 * Supports basic polygon and multigeometry parsing
 */

export interface ParsedKMLResult {
  polygons: Array<Array<[number, number]>>; // Each polygon is array of [lat, lng] pairs
  error?: string;
}

/**
 * Parse KML file content and extract polygon coordinates
 * @param kmlContent - String content of KML file
 * @returns Object with polygons array or error
 */
export function parseKML(kmlContent: string): ParsedKMLResult {
  try {
    const polygons: Array<Array<[number, number]>> = [];

    // Check if this is a NetworkLink reference (common for Google Maps KML exports)
    if (kmlContent.includes('<NetworkLink>') && !kmlContent.includes('<Polygon>')) {
      return {
        polygons: [],
        error: 'This KML file is a reference link (NetworkLink) to a Google Map. Please download the actual KML file with polygon data instead. In Google Maps: 1) Right-click your map layer, 2) Select "Export to KML", and 3) Choose to download the entire file.',
      };
    }

    // Use regex to find all coordinates within Polygon elements
    // KML format: <coordinates>lon,lat,0 lon,lat,0 ...</coordinates>
    const coordRegex = /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/g;
    let match;

    while ((match = coordRegex.exec(kmlContent)) !== null) {
      const coordString = match[1].trim();
      const coordinates = parseCoordinateString(coordString);

      if (coordinates.length >= 3) {
        polygons.push(coordinates);
      }
    }

    if (polygons.length === 0) {
      return {
        polygons: [],
        error: 'No valid polygon coordinates found in KML file. Please ensure the KML contains valid <Polygon> elements with <coordinates>. If you exported from Google Maps, make sure you downloaded the actual KML file (not a reference link).',
      };
    }

    return { polygons };
  } catch (error) {
    return {
      polygons: [],
      error: `Failed to parse KML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse coordinate string from KML
 * KML format: "lon,lat,elev lon,lat,elev lon,lat,elev"
 * Returns array of [lat, lng] pairs (reversed from KML order)
 * @param coordString - Raw coordinate string from KML
 * @returns Array of [lat, lng] coordinate pairs
 */
function parseCoordinateString(coordString: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];

  // Split by whitespace and filter empty strings
  const coords = coordString.split(/\s+/).filter((s) => s.length > 0);

  for (const coord of coords) {
    // Each coordinate is "lon,lat" or "lon,lat,elev"
    const parts = coord.split(',');

    if (parts.length >= 2) {
      try {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);

        if (!isNaN(lat) && !isNaN(lng)) {
          // KML uses [lon, lat], we store as [lat, lng]
          coordinates.push([lat, lng]);
        }
      } catch (error) {
        // Skip invalid coordinates
        continue;
      }
    }
  }

  return coordinates;
}

/**
 * Validate KML file by checking basic structure
 * @param kmlContent - String content of KML file
 * @returns true if file appears to be valid KML
 */
export function isValidKML(kmlContent: string): boolean {
  return kmlContent.includes('<kml') && (kmlContent.includes('<Polygon>') || kmlContent.includes('<polygon>'));
}
