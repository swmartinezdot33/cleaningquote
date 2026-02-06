import PricingStructuresClient from './PricingStructuresClient';

export default function PricingStructuresPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pricing Structures</h1>
      <PricingStructuresClient />
    </div>
  );
}
