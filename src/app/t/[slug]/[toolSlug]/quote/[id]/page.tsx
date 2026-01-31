import QuotePage from '@/app/quote/[id]/page';

export default async function OrgScopedQuotePage({
  params,
}: {
  params: Promise<{ slug: string; toolSlug: string; id: string }>;
}) {
  const { id } = await params;
  return <QuotePage params={Promise.resolve({ id })} />;
}
