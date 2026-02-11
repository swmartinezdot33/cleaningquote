'use client';

import React from 'react';
import { MapPin, Home, Navigation, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAP_LINKS = [
  {
    id: 'google',
    label: 'Open in Google Maps',
    href: (address: string) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    icon: MapPin,
    className: 'text-[#4285F4] hover:text-[#3367D6]',
  },
  {
    id: 'zillow',
    label: 'Open in Zillow',
    href: (address: string) =>
      `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`,
    icon: Home,
    className: 'text-[#006AFF] hover:text-[#0052CC]',
  },
  {
    id: 'waze',
    label: 'Open in Waze',
    href: (address: string) =>
      `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
    icon: Navigation,
    className: 'text-[#33CCFF] hover:text-[#00B4E6]',
  },
  {
    id: 'apple',
    label: 'Open in Apple Maps',
    href: (address: string) =>
      `https://maps.apple.com/?q=${encodeURIComponent(address)}`,
    icon: Map,
    className: 'text-muted-foreground hover:text-foreground',
  },
] as const;

export interface AddressMapLinksProps {
  /** Full address string (e.g. "123 Main St, City, ST 12345") */
  address: string;
  /** Optional class for the wrapper */
  className?: string;
  /** Show "View maps:" label (default true) */
  showLabel?: boolean;
  /** Size of icon buttons: 'sm' | 'md' (default 'sm') */
  size?: 'sm' | 'md';
}

/**
 * Renders "View maps:" with icon links to open the address in Google Maps,
 * Zillow, Waze, and Apple Maps. Use next to any displayed address.
 */
export function AddressMapLinks({
  address,
  className,
  showLabel = true,
  size = 'sm',
}: AddressMapLinksProps) {
  const trimmed = (address || '').trim();
  if (!trimmed) return null;

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label="Open address in maps"
    >
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          View maps:
        </span>
      )}
      {MAP_LINKS.map(({ id, label, href, icon: Icon, className: linkClass }) => (
        <a
          key={id}
          href={href(trimmed)}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          className={cn(
            'inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            buttonSize,
            linkClass
          )}
          aria-label={label}
        >
          <Icon className={iconSize} aria-hidden />
        </a>
      ))}
    </span>
  );
}
