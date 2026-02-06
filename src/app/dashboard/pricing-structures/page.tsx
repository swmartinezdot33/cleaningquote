import PricingStructuresClient from './PricingStructuresClient';

export default function PricingStructuresPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pricing</h1>
      <p className="text-muted-foreground">Create and manage named pricing structures for your organization. Each structure has a unique name and can be assigned to tools or service areas in Settings.</p>
      <PricingStructuresClient />
    </div>
  );
}
