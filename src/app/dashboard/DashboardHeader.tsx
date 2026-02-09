'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { OrgSwitcher } from '@/components/OrgSwitcher';
import { Menu, Settings, X } from 'lucide-react';

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

  const navLinks = (
    <>
      {orgs.length > 0 && (
        <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
      )}
      {isSuperAdmin && (
        <>
          <Link
            href="/dashboard/super-admin"
            onClick={closeMobileMenu}
            className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
          >
            Super Admin
          </Link>
          <Link
            href="/dashboard/super-admin/inbox"
            onClick={closeMobileMenu}
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
          >
            Inbox
          </Link>
        </>
      )}
      <Link
        href="/dashboard/quotes"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Quotes
      </Link>
      <Link
        href="/dashboard/crm"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Pipelines
      </Link>
      <Link
        href="/dashboard/crm/contacts"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Contacts
      </Link>
      <Link
        href="/dashboard"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Tools
      </Link>
      {selectedOrgRole === 'admin' && (
        <>
          <Link
            href="/dashboard/service-areas"
            onClick={closeMobileMenu}
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
          >
            Service Areas
          </Link>
          <Link
            href="/dashboard/pricing-structures"
            onClick={closeMobileMenu}
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
          >
            Pricing
          </Link>
        </>
      )}
      <Link
        href="/dashboard/crm/schedule"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Schedule
      </Link>
      {selectedOrgRole === 'admin' && (
        <Link
          href="/dashboard/settings"
          onClick={closeMobileMenu}
          className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline p-1.5 -m-1.5 rounded-md"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      )}
    </>
  );

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Desktop nav — aligned left */}
        <div className="hidden md:flex md:items-center md:gap-4">
          {navLinks}
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
                <span className="text-sm font-medium text-muted-foreground">
                  Menu
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
                {orgs.length > 0 && (
                  <div className="py-2 border-b border-gray-200 mb-2">
                    <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} onAfterChange={closeMobileMenu} />
                  </div>
                )}
                {isSuperAdmin && (
                  <>
                    <Link
                      href="/dashboard/super-admin"
                      onClick={closeMobileMenu}
                      className="py-3 px-3 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                    >
                      Super Admin
                    </Link>
                    <Link
                      href="/dashboard/super-admin/inbox"
                      onClick={closeMobileMenu}
                      className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                      Inbox
                    </Link>
                  </>
                )}
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
                  Pipelines
                </Link>
                <Link
                  href="/dashboard/crm/contacts"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Contacts
                </Link>
                <Link
                  href="/dashboard"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Tools
                </Link>
                {selectedOrgRole === 'admin' && (
                  <>
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
                  </>
                )}
                <Link
                  href="/dashboard/crm/schedule"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Schedule
                </Link>
                {selectedOrgRole === 'admin' && (
                  <Link
                    href="/dashboard/settings"
                    onClick={closeMobileMenu}
                    className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                )}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
