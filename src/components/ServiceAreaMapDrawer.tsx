'use client';

import { useEffect, useRef, useState } from 'react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { TerraDraw } from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { TerraDrawPolygonMode } from 'terra-draw';
import { TerraDrawSelectMode } from 'terra-draw';

export type PolygonCoords = Array<[number, number]>;

/** Per-zone label and color (same order as polygon array). */
export type ZoneDisplayItem = { label?: string; color?: string };

/** 6-digit hex palette for zone colors; use same list in UI picker and map so they stay in sync. */
export const DEFAULT_ZONE_COLORS_6 = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const DEFAULT_ZONE_COLORS = DEFAULT_ZONE_COLORS_6.map((c) => c + '80');

/** Map ID required for AdvancedMarkerElement. Set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in production for custom map styling. */
const DEFAULT_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

/** Use window.google from existing global (GooglePlacesAutocomplete). */
function getGoogle(): typeof window.google {
  return typeof window !== 'undefined' ? (window as Window & { google?: any }).google : undefined;
}

/** Compute centroid of a polygon for label placement. */
function polygonCentroid(coords: PolygonCoords): [number, number] {
  if (coords.length === 0) return [0, 0];
  let sumLat = 0, sumLng = 0;
  coords.forEach(([lat, lng]) => { sumLat += lat; sumLng += lng; });
  return [sumLat / coords.length, sumLng / coords.length];
}

/** Convert our [lat,lng][] to GeoJSON ring [lng,lat][] (closed). */
function coordsToGeoJSONRing(coords: PolygonCoords): number[][] {
  const ring = coords.map(([lat, lng]) => [lng, lat]);
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }
  return ring;
}

/** Convert GeoJSON polygon ring to our [lat,lng][] (drop closing point). */
function geoJSONRingToCoords(ring: number[][]): PolygonCoords {
  if (!ring || ring.length < 4) return [];
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

interface ServiceAreaMapDrawerProps {
  /** Initial polygon(s) to show and edit (optional). Single polygon or array of polygons. */
  initialPolygon?: PolygonCoords | PolygonCoords[] | null;
  /** Per-zone label and fill color (hex, optional). Same length as polygon array. */
  zoneDisplay?: ZoneDisplayItem[] | null;
  /** Called when the user finishes or edits polygons. Passes array of all polygons. */
  onPolygonChange?: (polygon: PolygonCoords | PolygonCoords[]) => void;
  /** Height of the map container (default 400px). */
  height?: number | string;
  /** Optional class for the wrapper. */
  className?: string;
  /** When true, only show polygons (no drawing toolbar, polygons not editable). Use for preview. */
  readOnly?: boolean;
  /** Optional office address; shown as a pin on the map (geocoded client-side). */
  officeAddress?: string | null;
  /** Optional address to pin on the map (e.g. contact/property address). Shown as a distinct pin (geocoded client-side). */
  pinnedAddress?: string | null;
}

export function ServiceAreaMapDrawer({
  initialPolygon,
  zoneDisplay,
  onPolygonChange,
  height = 400,
  className = '',
  readOnly = false,
  officeAddress = null,
  pinnedAddress = null,
}: ServiceAreaMapDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const terraDrawRef = useRef<TerraDraw | null>(null);
  const polygonRefs = useRef<any[]>([]);
  const labelMarkerRefs = useRef<any[]>([]);
  const officeMarkerRef = useRef<any>(null);
  const pinnedAddressMarkerRef = useRef<any>(null);
  const mapIdleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const onPolygonChangeRef = useRef(onPolygonChange);
  onPolygonChangeRef.current = onPolygonChange;
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

    let cancelled = false;

    async function initMap() {
      const google = getGoogle();
      if (!containerRef.current || !google?.maps) return;
      setError(null);
      try {
        const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;

        // Terra Draw's Google adapter uses map.data (Data layer). Vector maps (mapId) can have map.data null.
        // Use mapId only for read-only (AdvancedMarkerElement); editable mode uses classic map so map.data exists.
        const useMapId = readOnly;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 39.5, lng: -98.5 },
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          ...(useMapId ? { mapId: DEFAULT_MAP_ID } : {}),
        });
        mapRef.current = map;

        const display = Array.isArray(zoneDisplay) ? zoneDisplay : [];

        if (readOnly) {
          // Read-only: draw polygons with Polygon + AdvancedMarkerElement labels
          if (initialPolygons.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            const refs: any[] = [];
            const labelRefs: any[] = [];
            initialPolygons.forEach((coords, idx) => {
              if (coords.length < 3) return;
              const path = coords.map(([lat, lng]) => new google.maps.LatLng(lat, lng));
              path.forEach((p: any) => bounds.extend(p));
              const zone = display[idx];
              const fillColor = (zone?.color && /^#[0-9A-Fa-f]{6}$/.test(zone.color))
                ? zone.color + '99'
                : (zone?.color && /^#[0-9A-Fa-f]{8}$/.test(zone.color))
                  ? zone.color
                  : DEFAULT_ZONE_COLORS[idx % DEFAULT_ZONE_COLORS.length];
              const strokeColor = (zone?.color && /^#[0-9A-Fa-f]{6}$/.test(zone.color))
                ? zone.color
                : fillColor.slice(0, 7);
              const polygon = new google.maps.Polygon({
                paths: path,
                editable: false,
                map,
                fillColor,
                fillOpacity: 0.45,
                strokeColor,
                strokeWeight: 2,
              });
              refs.push(polygon);
              const labelText = (zone?.label && zone.label.trim()) ? zone.label.trim() : `Zone ${idx + 1}`;
              const [clat, clng] = polygonCentroid(coords);
              const el = document.createElement('div');
              el.textContent = labelText;
              el.style.cssText = 'padding:4px 8px;background:rgba(0,0,0,0.6);color:#fff;font-size:13px;font-weight:600;border-radius:4px;white-space:nowrap;';
              const marker = new AdvancedMarkerElement({
                map,
                position: { lat: clat, lng: clng },
                content: el,
                zIndex: 100 + idx,
              });
              labelRefs.push(marker);
            });
            polygonRefs.current = refs;
            labelMarkerRefs.current = labelRefs;
            if (bounds.getNorthEast() && bounds.getSouthWest()) {
              map.fitBounds(bounds);
            }
          }
        } else {
          // Editable: use Terra Draw. Wait for map 'idle' so the map's DOM (e.g. clickable layer) exists;
          // otherwise the adapter's getMapEventElement() can return null and TerraDraw calls addEventListener on null.
          const startTerraDraw = () => {
            if (cancelled || !mapRef.current) return;
            const adapter = new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 });
            const draw = new TerraDraw({
              adapter,
              modes: [
                new TerraDrawSelectMode({
                  flags: {
                    polygon: {
                      feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
                    },
                  },
                }),
                new TerraDrawPolygonMode({
                  styles: { fillColor: '#3b82f680', outlineColor: '#3b82f6', outlineWidth: 2 },
                }),
              ],
            });
            terraDrawRef.current = draw;

            const notifyFromSnapshot = () => {
              const features = draw.getSnapshot().filter((f) => f.geometry.type === 'Polygon');
              const all: PolygonCoords[] = features.map((f) => {
                const geom = f.geometry as { type: 'Polygon'; coordinates: number[][][] };
                const ring = geom.coordinates[0];
                return geoJSONRingToCoords(ring);
              }).filter((c) => c.length >= 3);
              const cb = onPolygonChangeRef.current;
              if (all.length === 1) cb?.(all[0]);
              else if (all.length > 1) cb?.(all);
            };

            draw.on('change', () => { if (!cancelled) notifyFromSnapshot(); });

            draw.start();
            draw.setMode(initialPolygons.length === 0 ? 'polygon' : 'select');

            if (initialPolygons.length > 0) {
              const features = initialPolygons.map((coords) => ({
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [coordsToGeoJSONRing(coords)] },
                properties: {},
              }));
              draw.addFeatures(features);
              const bounds = new google.maps.LatLngBounds();
              initialPolygons.forEach((coords) => {
                coords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
              });
              if (bounds.getNorthEast() && bounds.getSouthWest()) map.fitBounds(bounds);
            }
          };

          const idleListener = google.maps.event.addListener(map, 'idle', () => {
            google.maps.event.removeListener(idleListener);
            mapIdleListenerRef.current = null;
            startTerraDraw();
            // Trigger resize so map tiles paint correctly when drawer was mounted inside a dialog (container may have had 0 size at init)
            const g = getGoogle();
            if (g?.maps?.event?.trigger && mapRef.current) {
              setTimeout(() => {
                if (!cancelled && mapRef.current) g.maps.event.trigger(mapRef.current, 'resize');
              }, 150);
            }
          });
          mapIdleListenerRef.current = idleListener;
        }

        // Office pin: AdvancedMarkerElement when mapId (read-only), else classic Marker (editable/Terra Draw)
        const addressToGeocode = (typeof officeAddress === 'string' ? officeAddress.trim() : '') || null;
        if (addressToGeocode && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: addressToGeocode }, (results: any, status: string) => {
            if (cancelled || status !== 'OK' || !results?.[0]?.geometry?.location || !mapRef.current) return;
            const loc = results[0].geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            const prev = officeMarkerRef.current as any;
            if (prev?.setMap) prev.setMap(null);
            else if (prev?.map != null) prev.map = null;
            if (useMapId) {
              const pinEl = document.createElement('div');
              pinEl.style.cssText = 'width:20px;height:20px;background:#1d4ed8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
              officeMarkerRef.current = new AdvancedMarkerElement({
                map: mapRef.current,
                position: { lat, lng },
                content: pinEl,
                title: 'Office',
                zIndex: 200,
              });
            } else {
              officeMarkerRef.current = new google.maps.Marker({
                map: mapRef.current,
                position: { lat, lng },
                title: 'Office',
                zIndex: 200,
              });
            }
            if (initialPolygons.length > 0) {
              const officeBounds = new google.maps.LatLngBounds();
              officeBounds.extend({ lat, lng });
              initialPolygons.forEach((coords) => {
                coords.forEach(([la, ln]) => officeBounds.extend({ lat: la, lng: ln }));
              });
              mapRef.current.fitBounds(officeBounds);
            } else {
              mapRef.current.setCenter({ lat, lng });
              mapRef.current.setZoom(12);
            }
          });
        }

        // Pinned address pin (e.g. contact/property address) – distinct style from office
        const pinnedToGeocode = (typeof pinnedAddress === 'string' ? pinnedAddress.trim() : '') || null;
        if (pinnedToGeocode && google.maps.Geocoder) {
          const geocoder2 = new google.maps.Geocoder();
          geocoder2.geocode({ address: pinnedToGeocode }, (results: any, status: string) => {
            if (cancelled || status !== 'OK' || !results?.[0]?.geometry?.location || !mapRef.current) return;
            const loc = results[0].geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            const prev = pinnedAddressMarkerRef.current as any;
            if (prev?.setMap) prev.setMap(null);
            else if (prev?.map != null) prev.map = null;
            if (useMapId) {
              const pinEl = document.createElement('div');
              pinEl.style.cssText = 'width:22px;height:22px;background:#dc2626;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
              pinnedAddressMarkerRef.current = new AdvancedMarkerElement({
                map: mapRef.current,
                position: { lat, lng },
                content: pinEl,
                title: 'Address',
                zIndex: 201,
              });
            } else {
              pinnedAddressMarkerRef.current = new google.maps.Marker({
                map: mapRef.current,
                position: { lat, lng },
                title: 'Address',
                zIndex: 201,
              });
            }
            // Fit bounds to include office + polygons + pinned address
            const allBounds = new google.maps.LatLngBounds();
            allBounds.extend({ lat, lng });
            if (initialPolygons.length > 0) {
              initialPolygons.forEach((coords) => {
                coords.forEach(([la, ln]) => allBounds.extend({ lat: la, lng: ln }));
              });
            }
            if (allBounds.getNorthEast() && allBounds.getSouthWest()) {
              mapRef.current.fitBounds(allBounds);
            }
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load map');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!getGoogle()?.maps?.Map) {
      const t = setInterval(() => {
        if (getGoogle()?.maps?.Map) {
          clearInterval(t);
          setLoading(true);
          initMap();
        }
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }
    setLoading(true);
    initMap();

    return () => {
      cancelled = true;
      const idleListener = mapIdleListenerRef.current;
      if (idleListener && typeof (idleListener as any).remove === 'function') {
        (idleListener as any).remove();
        mapIdleListenerRef.current = null;
      } else {
        const g = getGoogle();
        if (g?.maps?.event?.removeListener) {
          try {
            g.maps.event.removeListener(idleListener as any);
          } catch (_) {}
        }
        mapIdleListenerRef.current = null;
      }
      const m = officeMarkerRef.current as any;
      if (m) {
        if (m.setMap) m.setMap(null);
        else if (m.map != null) m.map = null;
        officeMarkerRef.current = null;
      }
      const pm = pinnedAddressMarkerRef.current as any;
      if (pm) {
        if (pm.setMap) pm.setMap(null);
        else if (pm.map != null) pm.map = null;
        pinnedAddressMarkerRef.current = null;
      }
      if (terraDrawRef.current) {
        terraDrawRef.current.stop();
        terraDrawRef.current = null;
      }
      labelMarkerRefs.current.forEach((m) => {
        if (m) m.map = null;
      });
      labelMarkerRefs.current = [];
      polygonRefs.current.forEach((poly) => {
        if (poly?.setMap) poly.setMap(null);
      });
      polygonRefs.current = [];
      mapRef.current = null;
    };
  }, [initialPolygon, zoneDisplay, readOnly, officeAddress, pinnedAddress]);

  // When map is inside a dialog, container may get dimensions after open; trigger resize so tiles paint
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const g = getGoogle();
      if (g?.maps?.event?.trigger && mapRef.current) g.maps.event.trigger(mapRef.current, 'resize');
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [loading, error]);

  const style = typeof height === 'number' ? { height: `${height}px` } : { height };

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <LoadingDots size="lg" className="text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive z-10 p-4 text-center">
          {error}
        </div>
      )}
      {!readOnly && !loading && !error && (
        <div className="absolute top-2 left-2 right-2 z-10 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-2 rounded-md bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs font-medium shadow-md">
            Click map to add points · Double-click to finish polygon
          </span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
