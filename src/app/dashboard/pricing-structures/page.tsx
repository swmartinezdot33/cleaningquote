import { SettingsSubNav } from '@/components/dashboard/SettingsSubNav';
import PricingStructuresClient from './PricingStructuresClient';

export default function PricingStructuresPage() {
  return (
    <div className="space-y-6">
      <SettingsSubNav />
      <h1 className="text-2xl font-bold text-foreground">Pricing</h1>
      <p className="text-muted-foreground">Create and manage named pricing structures. Assign which structure each tool uses in Tool → Settings → Pricing Structure.</p>
      <PricingStructuresClient />
    </div>
  );
}
