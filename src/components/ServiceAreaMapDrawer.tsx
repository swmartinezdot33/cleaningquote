'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export type PolygonCoords = Array<[number, number]>;

/** Use window.google from existing global (GooglePlacesAutocomplete). */
function getGoogle(): typeof window.google {
  return typeof window !== 'undefined' ? (window as Window & { google?: any }).google : undefined;
}

interface ServiceAreaMapDrawerProps {
  /** Initial polygon(s) to show and edit (optional). Single polygon or array of polygons. */
  initialPolygon?: PolygonCoords | PolygonCoords[] | null;
  /** Called when the user finishes or edits polygons. Passes array of all polygons. */
  onPolygonChange?: (polygon: PolygonCoords | PolygonCoords[]) => void;
  /** Height of the map container (default 400px). */
  height?: number | string;
  /** Optional class for the wrapper. */
  className?: string;
  /** When true, only show polygons (no drawing toolbar, polygons not editable). Use for preview. */
  readOnly?: boolean;
}

export function ServiceAreaMapDrawer({
  initialPolygon,
  onPolygonChange,
  height = 400,
  className = '',
  readOnly = false,
}: ServiceAreaMapDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);
  const polygonRefs = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialPolygons: PolygonCoords[] = (() => {
    if (!initialPolygon || !Array.isArray(initialPolygon) || initialPolygon.length === 0) return [];
    const first = initialPolygon[0];
    if (Array.isArray(first) && first.length >= 2 && typeof first[0] === 'number') {
      return [initialPolygon as PolygonCoords];
    }
    return initialPolygon as PolygonCoords[];
  })();

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    function pathToCoords(path: any): PolygonCoords {
      const arr: PolygonCoords = [];
      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i);
        const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
        const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
        arr.push([lat, lng]);
      }
      return arr;
    }

    function collectAllCoords(): PolygonCoords[] {
      const out: PolygonCoords[] = [];
      polygonRefs.current.forEach((poly) => {
        if (poly && poly.getPath) {
          const coords = pathToCoords(poly.getPath());
          if (coords.length >= 3) out.push(coords);
        }
      });
      return out;
    }

    function notifyChange() {
      const all = collectAllCoords();
      if (all.length === 1) onPolygonChange?.(all[0]);
      else if (all.length > 1) onPolygonChange?.(all);
    }

    function initMap() {
      const google = getGoogle();
      if (!containerRef.current || !google?.maps) return;
      setError(null);
      try {
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 39.5, lng: -98.5 },
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        });
        mapRef.current = map;

        // Draw existing polygons (create or edit)
        if (initialPolygons.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          const refs: any[] = [];
          initialPolygons.forEach((coords) => {
            if (coords.length < 3) return;
            const path = coords.map(([lat, lng]) => new google.maps.LatLng(lat, lng));
            path.forEach((p: any) => bounds.extend(p));
            const polygon = new google.maps.Polygon({
              paths: path,
              editable: !readOnly,
              map,
            });
            refs.push(polygon);
            if (!readOnly) {
              ['insert_at', 'set_at'].forEach((eventName) => {
                google.maps.event.addListener(polygon.getPath(), eventName, () => notifyChange());
              });
            }
          });
          polygonRefs.current = refs;
          if (bounds.getNorthEast() && bounds.getSouthWest()) {
            map.fitBounds(bounds);
          }
        }

        // Show drawing toolbar only when not readOnly (preview mode)
        if (!readOnly) {
          const drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: initialPolygons.length === 0 ? google.maps.drawing.OverlayType.POLYGON : null,
            drawingControl: true,
            drawingControlOptions: {
              position: (google.maps as any).ControlPosition?.TOP_CENTER ?? 2,
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
          });
          drawingManager.setMap(map);
          drawingManagerRef.current = drawingManager;

          google.maps.event.addListener(drawingManager, 'polygoncomplete', (poly: any) => {
            const path = poly.getPath();
            poly.setEditable(true);
            poly.setMap(map);
            polygonRefs.current = [...polygonRefs.current, poly];
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

            ['insert_at', 'set_at'].forEach((eventName) => {
              google.maps.event.addListener(path, eventName, () => notifyChange());
            });
            notifyChange();
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      } finally {
        setLoading(false);
      }
    }

    const g = getGoogle();
    if (!g?.maps?.Map) {
      const t = setInterval(() => {
        if (getGoogle()?.maps?.Map) {
          clearInterval(t);
          initMap();
        }
      }, 200);
      return () => clearInterval(t);
    }
    setLoading(true);
    initMap();

    return () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
      polygonRefs.current.forEach((poly) => {
        if (poly && poly.setMap) poly.setMap(null);
      });
      polygonRefs.current = [];
      mapRef.current = null;
    };
  }, [initialPolygon, onPolygonChange, readOnly]);

  const style = typeof height === 'number' ? { height: `${height}px` } : { height };

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive z-10 p-4 text-center">
          {error}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
