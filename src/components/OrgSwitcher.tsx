'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function OrgSwitcher({
  orgs,
  selectedOrgId,
  onAfterChange,
}: {
  orgs: Org[];
  selectedOrgId: string | null;
  /** Called after org switch (e.g. close mobile menu so user sees refreshed page) */
  onAfterChange?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [current, setCurrent] = useState(selectedOrgId);

  useEffect(() => {
    setCurrent(selectedOrgId || (orgs[0]?.id ?? null));
  }, [selectedOrgId, orgs]);

  const handleChange = (orgId: string) => {
    setCurrent(orgId);
    document.cookie = `selected_org_id=${encodeURIComponent(orgId)}; path=/; max-age=31536000`;
    onAfterChange?.();
    // Defer refresh so cookie is committed before the refetch (fixes mobile/portal not seeing new org data)
    const path = pathname ?? '/dashboard';
    router.push(path);
    setTimeout(() => router.refresh(), 0);
  };

  if (orgs.length <= 1) {
    return (
      <span className="text-sm font-medium text-foreground">
        {orgs[0]?.name ?? 'Select org'}
      </span>
    );
  }

  return (
    <select
      value={current ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
