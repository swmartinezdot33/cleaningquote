import type { Metadata } from 'next';
import { getToolConfigForOrgTool } from '@/lib/tools/config';

/** Client-facing layout: org-scoped tool /t/[orgSlug]/[toolSlug]. Overrides root metadata so link previews show client branding, not CleanQuote. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; toolSlug: string }>;
}): Promise<Metadata> {
  const { slug: orgSlug, toolSlug } = await params;
  if (!orgSlug || !toolSlug) return {};

  const config = await getToolConfigForOrgTool(orgSlug, toolSlug);
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
    robots: { index: true, follow: true },
  };
}

export default function OrgToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
