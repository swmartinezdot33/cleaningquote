'use client';

import { useRouter } from 'next/navigation';
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
}: {
  orgs: Org[];
  selectedOrgId: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(selectedOrgId);

  useEffect(() => {
    setCurrent(selectedOrgId || (orgs[0]?.id ?? null));
  }, [selectedOrgId, orgs]);

  const handleChange = (orgId: string) => {
    setCurrent(orgId);
    document.cookie = `selected_org_id=${encodeURIComponent(orgId)}; path=/; max-age=31536000`;
    router.refresh();
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
