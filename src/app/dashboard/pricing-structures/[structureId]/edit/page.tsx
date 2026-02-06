import Link from 'next/link';
import { PricingStructureEditClient } from './PricingStructureEditClient';

export default async function PricingStructureEditPage({
  params,
}: {
  params: Promise<{ structureId: string }>;
}) {
  const { structureId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/pricing-structures" className="text-sm font-medium text-primary hover:underline">
          ← Back to Pricing
        </Link>
      </div>
      <PricingStructureEditClient structureId={structureId} />
    </div>
  );
}
