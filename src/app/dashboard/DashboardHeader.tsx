'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { OrgSwitcher } from '@/components/OrgSwitcher';
import { Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function isNavActive(href: string, pathname: string): boolean {
  const clean = pathname.replace(/\/$/, '') || '/';
  const base = href.replace(/\/$/, '') || '/';
  if (base === '/dashboard') return clean === '/dashboard';
  // Leads is /dashboard/crm; only active on that exact path, not on /dashboard/crm/contacts
  if (base === '/dashboard/crm') return clean === '/dashboard/crm';
  return clean === base || clean.startsWith(base + '/');
}

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface GHLSession {
  locationId: string;
  companyId: string;
  userId: string;
}

interface DashboardHeaderProps {
  orgs: Org[];
  selectedOrgId: string | null;
  selectedOrgRole?: string;
  userDisplayName: string;
  isSuperAdmin: boolean;
  ghlSession?: GHLSession | null;
}

export function DashboardHeader({
  orgs,
  selectedOrgId,
  selectedOrgRole,
  userDisplayName,
  isSuperAdmin,
  ghlSession: _ghlSession,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const pathname = usePathname() ?? '';
  const router = useRouter();

  const navLinkClass = (href: string) => {
    const active = isNavActive(href, pathname);
    return `text-sm no-underline border-b-2 py-3.5 px-0.5 -mb-px transition-colors ${
      active
        ? 'text-purple-600 border-purple-600 font-semibold'
        : 'text-muted-foreground border-transparent font-medium hover:text-foreground hover:no-underline hover:border-purple-600'
    }`;
  };

  const navLinks = (
    <>
      <span className="text-sm font-medium text-foreground" aria-label="CleanQuote">
        CleanQuote.io
      </span>
      {orgs.length > 1 && (
        <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
      )}
      {isSuperAdmin && (
        <Link
          href="/dashboard/super-admin"
          onClick={closeMobileMenu}
          className={`text-sm no-underline border-b-2 py-3.5 px-0.5 -mb-px transition-colors ${
            isNavActive('/dashboard/super-admin', pathname)
              ? 'text-amber-600 border-amber-600 font-semibold'
              : 'text-muted-foreground border-transparent font-medium hover:text-amber-700'
          }`}
        >
          Super Admin
        </Link>
      )}
      <Link
        href="/dashboard"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard')}
      >
        Dashboard
      </Link>
      <Link
        href="/dashboard/crm/inbox"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/crm/inbox')}
      >
        Inbox
      </Link>
      <Link
        href="/dashboard/quotes"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/quotes')}
      >
        Quotes
      </Link>
      <Link
        href="/dashboard/crm"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/crm')}
      >
        Leads
      </Link>
      <Link
        href="/dashboard/crm/contacts"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/crm/contacts')}
      >
        Contacts
      </Link>
      <Link
        href="/dashboard/tools"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/tools')}
      >
        Tools
      </Link>
      <Link
        href="/dashboard/service-areas"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/service-areas')}
      >
        Service Areas
      </Link>
      <Link
        href="/dashboard/pricing-structures"
        onClick={closeMobileMenu}
        className={navLinkClass('/dashboard/pricing-structures')}
      >
        Pricing
      </Link>
    </>
  );

  return (
    <header className="dashboard-header border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Desktop nav — aligned left */}
        <div className="hidden md:flex md:items-center md:gap-4">
          {navLinks}
        </div>
        {/* Right: New Quote button (desktop) — same look as page button, not a nav link */}
        <div className="hidden md:block">
          <Button
            variant="default"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => router.push('/dashboard/quotes?openNewQuote=1')}
          >
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </div>
        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-md"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {/* Mobile menu: portal with solid background */}
      {mounted &&
        createPortal(
          <div
            className={`md:hidden fixed inset-0 z-[9999] transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={!mobileMenuOpen}
          >
            <button
              type="button"
              onClick={closeMobileMenu}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-label="Close menu"
            />
            <div
              className={`absolute top-0 right-0 bottom-0 w-full max-w-xs border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
              style={{ backgroundColor: '#f9fafb' }}
            >
              <div
                className="flex items-center justify-between h-14 px-4 border-b border-gray-200"
                style={{ backgroundColor: '#f9fafb' }}
              >
                <span className="text-sm font-medium text-foreground" aria-label="CleanQuote">
                  CleanQuote.io
                </span>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav
                className="flex flex-col gap-1 p-4 overflow-y-auto"
                style={{ backgroundColor: '#f9fafb' }}
              >
                {orgs.length > 1 && (
                  <div className="py-2 border-b border-gray-200 mb-2">
                    <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} onAfterChange={closeMobileMenu} />
                  </div>
                )}
                {isSuperAdmin && (
                  <Link
                    href="/dashboard/super-admin"
                    onClick={closeMobileMenu}
                    className="py-3 px-3 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                  >
                    Super Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/crm/inbox"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Inbox
                </Link>
                <Link
                  href="/dashboard/quotes"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Quotes
                </Link>
                <Link
                  href="/dashboard/crm"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Leads
                </Link>
                <Link
                  href="/dashboard/crm/contacts"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Contacts
                </Link>
                <Link
                  href="/dashboard/tools"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Tools
                </Link>
                <Link
                  href="/dashboard/service-areas"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Service Areas
                </Link>
                <Link
                  href="/dashboard/pricing-structures"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Pricing
                </Link>
                <div className="pt-3 mt-2 border-t border-gray-200">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      router.push('/dashboard/quotes?openNewQuote=1');
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    New Quote
                  </Button>
                </div>
              </nav>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
