'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface CloneToolButtonProps {
  toolId: string;
  toolName?: string;
  toolOrgId?: string;
  /** Optional class for the trigger button (e.g. to match Open/Share/Code row) */
  className?: string;
}

export function CloneToolButton({ toolId, toolName = 'this tool', toolOrgId, className }: CloneToolButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [targetOrgId, setTargetOrgId] = useState<string>(toolOrgId ?? '');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/dashboard/super-admin/orgs')
        .then((r) => {
          if (r.ok) return r.json();
          return { orgs: [], error: true };
        })
        .then((d) => {
          if (!d.error && d.orgs?.length) {
            setAllOrgs(d.orgs);
            setIsSuperAdmin(true);
            setTargetOrgId(toolOrgId ?? d.orgs[0]?.id ?? '');
          } else {
            setTargetOrgId(toolOrgId ?? '');
          }
        })
        .catch(() => {});
    }
  }, [open, toolOrgId]);

  const clone = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSuperAdmin && targetOrgId ? { target_org_id: targetOrgId } : {}),
      });
      const data = await res.json();
      if (res.ok && data.tool?.id) {
        setOpen(false);
        router.push(`/dashboard/tools/${data.tool.id}`);
        router.refresh();
      } else {
        alert(data.error ?? 'Failed to clone tool');
      }
    } catch {
      alert('Failed to clone tool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={className ?? "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"}
        title="Clone this tool"
      >
        <Copy className="h-3.5 w-3.5" />
        Clone
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Clone tool</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Clone &quot;{toolName}&quot; into your organization? Settings, survey, pricing, and GHL config will be copied.
            </p>

            {isSuperAdmin && allOrgs.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Clone to organization</label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {allOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clone}
                disabled={loading || (isSuperAdmin && !targetOrgId)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Cloning…' : 'Clone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
