import { SettingsSubNav } from '@/components/dashboard/SettingsSubNav';
import ServiceAreasClient from './ServiceAreasClient';

export default function ServiceAreasPage() {
  return (
    <div className="space-y-6">
      <SettingsSubNav />
      <ServiceAreasClient />
    </div>
  );
}
