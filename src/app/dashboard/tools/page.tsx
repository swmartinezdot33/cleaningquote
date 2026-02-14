import { SettingsSubNav } from '@/components/dashboard/SettingsSubNav';
import ToolsListClient from './ToolsListClient';

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <SettingsSubNav />
      <ToolsListClient />
    </div>
  );
}
