/**
 * Point-in-Polygon algorithm using ray casting method
 * Determines if a point (lat, lng) is inside a polygon defined by an array of [lat, lng] coordinates
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export type PolygonCoordinates = Array<[number, number]>; // [lat, lng] pairs

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point - Point to check {lat, lng}
 * @param polygon - Array of [lat, lng] coordinate pairs forming a polygon
 * @returns true if point is inside polygon, false otherwise
 */
export function pointInPolygon(point: Coordinate, polygon: PolygonCoordinates): boolean {
  const { lat, lng } = point;

  // A point in the polygon must have at least 3 vertices
  if (polygon.length < 3) {
    return false;
  }

  let isInside = false;

  // Ray casting algorithm
  // Cast a ray from the point to the right (positive longitude)
  // Count intersections with polygon edges
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const polyLat1 = polygon[i][0]; // latitude of first vertex
    const polyLng1 = polygon[i][1]; // longitude of first vertex
    const polyLat2 = polygon[j][0]; // latitude of second vertex
    const polyLng2 = polygon[j][1]; // longitude of second vertex

    // Check if the horizontal ray from the point intersects this edge
    // The ray is at the point's latitude, going right (increasing longitude)
    const intersect =
      // Point's latitude must be between the two edge latitudes
      ((polyLat1 > lat) !== (polyLat2 > lat)) &&
      // Calculate where the edge intersects the horizontal ray (at point's latitude)
      // Then check if that intersection is to the right of the point's longitude
      lng < ((polyLng2 - polyLng1) * (lat - polyLat1)) / (polyLat2 - polyLat1) + polyLng1;

    if (intersect) {
      isInside = !isInside;
    }

    j = i;
  }

  return isInside;
}

/**
 * Check if a point is on the boundary of a polygon (within tolerance)
 * @param point - Point to check {lat, lng}
 * @param polygon - Array of [lat, lng] coordinate pairs
 * @param tolerance - Tolerance in degrees (default 0.0001 ≈ 11 meters)
 * @returns true if point is on or near boundary
 */
export function pointOnPolygonBoundary(
  point: Coordinate,
  polygon: PolygonCoordinates,
  tolerance: number = 0.0001
): boolean {
  const { lat, lng } = point;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length]; // Wrap around to close polygon

    // Check if point is near line segment
    if (pointNearLineSegment(point, { lat: p1[0], lng: p1[1] }, { lat: p2[0], lng: p2[1] }, tolerance)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a point is near a line segment
 * @param point - Point to check
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @param tolerance - Tolerance in degrees
 * @returns true if point is within tolerance of line segment
 */
function pointNearLineSegment(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate,
  tolerance: number
): boolean {
  const { lat: px, lng: py } = point;
  const { lat: x1, lng: y1 } = lineStart;
  const { lat: x2, lng: y2 } = lineEnd;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= tolerance;
}
