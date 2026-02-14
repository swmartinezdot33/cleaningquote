'use client';

import Link from 'next/link';
import { SettingsSubNav } from '@/components/dashboard/SettingsSubNav';
import { Wrench, MapPin, DollarSign } from 'lucide-react';

const SECTIONS = [
  { href: '/dashboard/tools', label: 'Tools', description: 'Quote tools, forms, and GHL integration', icon: Wrench },
  { href: '/dashboard/service-areas', label: 'Service Areas', description: 'Define where you offer service', icon: MapPin },
  { href: '/dashboard/pricing-structures', label: 'Pricing', description: 'Pricing structures and tiers', icon: DollarSign },
] as const;

export default function SettingsPageClient() {
  return (
    <div className="space-y-6">
      <SettingsSubNav />
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground mb-6">Manage tools, service areas, and pricing.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 hover:bg-muted/50 hover:border-primary/30 transition-colors"
            >
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <h2 className="font-semibold text-foreground">{label}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
