'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ServiceAreaMapDrawer, DEFAULT_ZONE_COLORS_6, type PolygonCoords, type ZoneDisplayItem } from '@/components/ServiceAreaMapDrawer';
import { LoadingDots } from '@/components/ui/loading-dots';
import { useDashboardApi } from '@/lib/dashboard-api';

export interface ServiceAreaMapViewModalProps {
  /** Address to pin on the map (e.g. contact or property address). */
  address: string | null;
  /** Called when the modal is closed. */
  onClose: () => void;
}

interface MapDataArea {
  id: string;
  name: string;
  polygons: PolygonCoords[];
  zoneDisplay: ZoneDisplayItem[];
}

interface MapData {
  officeAddress: string | null;
  areas: MapDataArea[];
}

/**
 * Modal that shows all org service areas on a map with office pin and the given address pinned.
 * Fetches map data from /api/dashboard/service-areas/map-data.
 */
export function ServiceAreaMapViewModal({ address, onClose }: ServiceAreaMapViewModalProps) {
  const { api } = useDashboardApi();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<string[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const loadMapData = useCallback(() => {
    if (!api) return;
    setLoading(true);
    setError(null);
    api('/api/dashboard/service-areas/map-data')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load map data'))))
      .then((d: { officeAddress?: string | null; areas?: MapDataArea[] }) => {
        setMapData({
          officeAddress: d.officeAddress ?? null,
          areas: d.areas ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load map'))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (address != null) loadMapData();
  }, [address, loadMapData]);

  const loadActiveCustomerAddresses = useCallback(() => {
    if (!api) return;
    setCustomersLoading(true);
    api('/api/dashboard/service-areas/active-customer-addresses')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load customers'))))
      .then((d: { addresses?: string[]; needsConnect?: boolean }) => {
        setCustomerAddresses(Array.isArray(d.addresses) ? d.addresses : []);
      })
      .catch(() => setCustomerAddresses([]))
      .finally(() => setCustomersLoading(false));
  }, [api]);

  const handleShowAllCustomersChange = (checked: boolean) => {
    setShowAllCustomers(checked);
    if (checked && customerAddresses.length === 0 && !customersLoading) {
      loadActiveCustomerAddresses();
    } else if (!checked) {
      setCustomerAddresses([]);
    }
  };

  const open = address != null && address.trim() !== '';
  const pinnedNorm = (address ?? '').trim().toLowerCase();
  const customerAddressesForMap =
    showAllCustomers && customerAddresses.length > 0
      ? customerAddresses.filter((a) => a.trim().toLowerCase() !== pinnedNorm)
      : undefined;

  const allPolygons: PolygonCoords[] = mapData
    ? mapData.areas.flatMap((a) => a.polygons)
    : [];
  const allZoneDisplay: ZoneDisplayItem[] = mapData
    ? mapData.areas.flatMap((a) =>
        a.zoneDisplay.length > 0
          ? a.zoneDisplay
          : a.polygons.map((_, i) => ({
              label: a.name + (a.polygons.length > 1 ? ` (${i + 1})` : ''),
              color: DEFAULT_ZONE_COLORS_6[i % DEFAULT_ZONE_COLORS_6.length],
            }))
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Service area map</DialogTitle>
          <DialogDescription>
            All service areas for your org. Office and the selected address are pinned.
          </DialogDescription>
        </DialogHeader>
        {!loading && !error && mapData && (
          <div className="px-6 pb-2 flex items-center gap-2">
            <input
              id="service-area-map-view-all-customers"
              type="checkbox"
              checked={showAllCustomers}
              onChange={(e) => handleShowAllCustomersChange(e.target.checked)}
              disabled={customersLoading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="service-area-map-view-all-customers" className="text-sm font-medium cursor-pointer">
              View all customers
              {customersLoading && (
                <span className="ml-2 text-muted-foreground font-normal">
                  <LoadingDots size="sm" className="inline" />
                </span>
              )}
            </Label>
            <span className="text-xs text-muted-foreground">
              Show addresses of contacts tagged &quot;active&quot; or &quot;active client&quot;
            </span>
            {showAllCustomers && !customersLoading && customerAddresses.length === 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-500">
                No contacts with these tags (or no addresses) found.
              </span>
            )}
            {showAllCustomers && !customersLoading && customerAddresses.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {customerAddresses.length} customer{customerAddresses.length !== 1 ? 's' : ''} on map
              </span>
            )}
          </div>
        )}
        <div className="flex-1 min-h-[400px] px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center h-[420px] bg-muted/30 rounded-lg">
              <LoadingDots size="lg" className="text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}
          {!loading && !error && mapData && (
            <>
              <div className="rounded-lg overflow-hidden border border-border">
                <ServiceAreaMapDrawer
                  initialPolygon={allPolygons.length > 0 ? allPolygons : undefined}
                  zoneDisplay={allZoneDisplay.length > 0 ? allZoneDisplay : undefined}
                  readOnly
                  height={420}
                  officeAddress={mapData.officeAddress}
                  pinnedAddress={address ?? undefined}
                  customerAddresses={customerAddressesForMap}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Blue: office · Red: this address · Green: other customers
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
