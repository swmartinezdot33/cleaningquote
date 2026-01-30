import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import type { Tool } from '@/lib/supabase/types';
import ToolPricingClient from './ToolPricingClient';

export default async function ToolPricingPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const supabase = await createSupabaseServerSSR();
  const { data } = await supabase.from('tools').select('*').eq('id', toolId).single();
  const tool = data as Tool | null;
  if (!tool) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/tools/${toolId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          ← Back to {tool.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Pricing — {tool.name}</h1>
      <ToolPricingClient toolId={toolId} />
    </div>
  );
}
