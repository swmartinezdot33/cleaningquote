'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { dashboardApiOptions } from '@/lib/dashboard-api';

export interface DashboardOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface DashboardContextValue {
  org: DashboardOrg | null;
  orgId: string | null;
  locationId: string | null;
  orgs: DashboardOrg[];
  selectedOrgId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultContext: DashboardContextValue = {
  org: null,
  orgId: null,
  locationId: null,
  orgs: [],
  selectedOrgId: null,
  loading: true,
  error: null,
  refetch: async () => {},
};

const DashboardContext = createContext<DashboardContextValue>(defaultContext);

export function useDashboardContext(): DashboardContextValue {
  return useContext(DashboardContext);
}

interface DashboardContextProviderProps {
  children: ReactNode;
}

export function DashboardContextProvider({ children }: DashboardContextProviderProps) {
  const locationId = useEffectiveLocationId();
  const [org, setOrg] = useState<DashboardOrg | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<DashboardOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!locationId) {
      setOrg(null);
      setOrgId(null);
      setOrgs([]);
      setSelectedOrgId(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { url, init } = dashboardApiOptions(`/api/dashboard/context`, locationId);
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrg(null);
        setOrgId(null);
        setOrgs([]);
        setSelectedOrgId(null);
        setError(data?.error ?? 'Failed to load context');
        return;
      }
      const resolvedOrg = data.org ?? null;
      const resolvedOrgId = data.orgId ?? null;
      const orgsList: DashboardOrg[] = Array.isArray(data.orgs) ? data.orgs : resolvedOrg ? [resolvedOrg] : [];
      setOrg(resolvedOrg);
      setOrgId(resolvedOrgId);
      setOrgs(orgsList);
      setSelectedOrgId(resolvedOrgId);
    } catch (err) {
      setOrg(null);
      setOrgId(null);
      setOrgs([]);
      setSelectedOrgId(null);
      setError(err instanceof Error ? err.message : 'Failed to load context');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      org,
      orgId,
      locationId,
      orgs,
      selectedOrgId,
      loading,
      error,
      refetch: fetchContext,
    }),
    [org, orgId, locationId, orgs, selectedOrgId, loading, error, fetchContext]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
