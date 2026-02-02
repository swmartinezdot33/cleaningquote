'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Share2, CopyPlus, Trash2, Check, Pencil } from 'lucide-react';
interface Org {
  id: string;
  name: string;
  slug: string;
}

interface ToolCardActionsProps {
  toolId: string;
  toolName: string;
  toolSlug: string;
  toolOrgId: string;
}

function IconButton({
  onClick,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      title={title}
    >
      {children}
    </button>
  );
}

export function ToolCardActions({ toolId, toolName, toolSlug, toolOrgId }: ToolCardActionsProps) {
  const router = useRouter();
  const [copyId, setCopyId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [targetOrgId, setTargetOrgId] = useState(toolOrgId);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const surveyUrl = `${baseUrl}/t/${toolSlug}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopyId('share');
      setTimeout(() => setCopyId(null), 2000);
    } catch {}
  };

  const handleCloneOpen = () => {
    setCloneOpen(true);
    fetch('/api/dashboard/super-admin/orgs')
      .then((r) => (r.ok ? r.json() : { orgs: [], error: true }))
      .then((d) => {
        if (!d.error && d.orgs?.length) {
          setAllOrgs(d.orgs);
          setIsSuperAdmin(true);
          setTargetOrgId(toolOrgId ?? d.orgs[0]?.id ?? '');
        } else {
          setTargetOrgId(toolOrgId);
        }
      })
      .catch(() => {});
  };

  const handleClone = async () => {
    setCloneLoading(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSuperAdmin && targetOrgId ? { target_org_id: targetOrgId } : {}),
      });
      const data = await res.json();
      if (res.ok && data.tool?.id) {
        setCloneOpen(false);
        router.push(`/dashboard/tools/${data.tool.id}`);
        router.refresh();
      } else {
        alert(data.error ?? 'Failed to clone tool');
      }
    } catch {
      alert('Failed to clone tool');
    } finally {
      setCloneLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDeleteOpen(false);
        router.refresh();
      } else {
        alert(data.error ?? 'Failed to delete tool');
      }
    } catch {
      alert('Failed to delete tool');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/dashboard/tools/${toolId}`}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Edit tool"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <IconButton onClick={() => window.open(surveyUrl, '_blank')} title="Open quote form">
        <ExternalLink className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={handleShare} title={copyId === 'share' ? 'Link copied' : 'Copy link'}>
        {copyId === 'share' ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
      </IconButton>
      <IconButton onClick={handleCloneOpen} title="Clone">
        <CopyPlus className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={() => setDeleteOpen(true)} title="Delete">
        <Trash2 className="h-4 w-4" />
      </IconButton>

      {cloneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !cloneLoading && setCloneOpen(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !cloneLoading && setCloneOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="button" onClick={handleClone} disabled={cloneLoading || (isSuperAdmin && !targetOrgId)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {cloneLoading ? 'Cloning…' : 'Clone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !deleteLoading && setDeleteOpen(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Delete tool</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete &quot;{toolName}&quot;? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !deleteLoading && setDeleteOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
