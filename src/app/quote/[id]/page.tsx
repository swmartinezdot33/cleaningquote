import { getQuotePagePrimaryColor } from '@/lib/tools/config';
import QuotePageClient from './QuotePageClient';

export const dynamic = 'force-dynamic';

/** Server component: fetch primary color for first paint so user never sees wrong color flash. */
export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const initialPrimaryColor = await getQuotePagePrimaryColor(undefined);
  return (
    <>
      {/* Inline critical color so first paint never shows default (no flash) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--quote-primary:${initialPrimaryColor};--quote-primary-color:${initialPrimaryColor};}`,
        }}
      />
      <QuotePageClient initialPrimaryColor={initialPrimaryColor} />
    </>
  );
}
