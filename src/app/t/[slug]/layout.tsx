import type { Metadata } from 'next';
import { getToolConfigForPage } from '@/lib/tools/config';

/** Client-facing layout: single-slug tool /t/[slug]. Overrides root metadata so link previews show client branding, not CleanQuote. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return {};

  const config = await getToolConfigForPage(slug);
  const title = config?.widget?.title?.trim() || 'Get Your Quote';
  const description = config?.widget?.subtitle?.trim() || 'Get your instant quote';

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      title,
      description,
      images: [], // No image — avoids CleanQuote logo in link previews
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    // Override robots to allow indexing of quote tools
    robots: { index: true, follow: true },
  };
}

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
