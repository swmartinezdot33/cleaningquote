import PricingStructuresClient from './PricingStructuresClient';

export default function PricingStructuresPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pricing</h1>
      <p className="text-muted-foreground">Create and manage named pricing structures. Build multiple structures, then assign which structure each tool uses for quotes.</p>
      <PricingStructuresClient />
    </div>
  );
}
