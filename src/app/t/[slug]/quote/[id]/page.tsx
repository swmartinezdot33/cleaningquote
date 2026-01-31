import { getQuotePagePrimaryColor } from '@/lib/tools/config';
import QuotePageClient from '@/app/quote/[id]/QuotePageClient';

export const dynamic = 'force-dynamic';

/** Server component: fetch primary color by slug for first paint (no color flash). */
export default async function ToolQuotePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug } = await params;
  const initialPrimaryColor = await getQuotePagePrimaryColor(slug);
  return <QuotePageClient initialPrimaryColor={initialPrimaryColor} />;
}
