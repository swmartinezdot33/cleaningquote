'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';

export function CloneToolButton({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const clone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/clone`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.tool?.id) {
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
    <button
      type="button"
      onClick={clone}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      title="Clone this tool"
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {loading ? 'Cloning…' : 'Clone'}
    </button>
  );
}
