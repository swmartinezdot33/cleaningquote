'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SETTINGS_LINKS = [
  { href: '/dashboard/tools', label: 'Tools' },
  { href: '/dashboard/service-areas', label: 'Service Areas' },
  { href: '/dashboard/pricing-structures', label: 'Pricing' },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="flex items-center justify-center gap-1 border-b border-border bg-card/50 px-1 -mx-4 sm:-mx-6 lg:-mx-8 mb-6" aria-label="Settings sections">
      {SETTINGS_LINKS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
