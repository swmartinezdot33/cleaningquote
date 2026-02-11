'use client';

import './globals.css';
import { useState, useEffect, Suspense } from 'react';

function debugLog(location: string, message: string, data?: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data: data ?? {}, timestamp: Date.now() }) }).catch(() => {});
}
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { SignupModal } from '@/components/SignupModal';
import {
  Sparkles,
  Zap,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

function Header({ onSignupClick }: { onSignupClick: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    setMounted(true);
    debugLog('MarketingPage.tsx:Header-mount', 'Header mounted', {});
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navLinks = (
    <>
      <a
        href="#features"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Features
      </a>
      <a
        href="#capabilities"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Capabilities
      </a>
      <a
        href="#pricing"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Pricing
      </a>
      <a
        href="#faq"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        FAQ
      </a>
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo />
        </Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-3 sm:gap-6" aria-label="Main navigation">
          {navLinks}
          <Link href="/login">
            <Button variant="ghost" size="sm" className="rounded-none font-medium">
              Log in
            </Button>
          </Link>
          <Button size="sm" className="rounded-none font-medium" onClick={onSignupClick}>
            Sign up
          </Button>
        </nav>
        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-none"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {/* Mobile menu: render in portal so background paints above everything */}
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
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm font-medium text-muted-foreground">Menu</span>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-none"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-4" style={{ backgroundColor: '#f9fafb' }}>
                <a
                  href="#features"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-none transition-colors"
                >
                  Features
                </a>
                <a
                  href="#capabilities"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-none transition-colors"
                >
                  Capabilities
                </a>
                <a
                  href="#pricing"
                  onClick={closeMobileMenu}
                  className="py-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-none transition-colors"
                >
                  Pricing
                </a>
                <div className="border-t border-gray-200 mt-2 pt-4 flex flex-col gap-2" style={{ backgroundColor: '#f9fafb' }}>
                  <Link href="/login" onClick={closeMobileMenu}>
                    <Button variant="ghost" size="sm" className="w-full justify-center rounded-none font-medium">
                      Log in
                    </Button>
                  </Link>
                  <Button size="sm" className="w-full rounded-none font-medium" onClick={() => { closeMobileMenu(); onSignupClick(); }}>
                    Sign up
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

function Hero({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Layered gradients + soft orbs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background via-40% to-primary/15" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl -z-10" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/15 blur-3xl -z-10" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-none border-2 border-primary/30 bg-white/60 px-4 py-1.5 text-sm font-medium text-primary shadow-lg shadow-primary/20 backdrop-blur-md">
          <Sparkles className="h-4 w-4" />
          Quote, close, and manage leads in one place
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Your sales hub for cleaning.{' '}
          <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Quote. Close. Grow.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
          Instant quotes so you're not just giving out a price—you're closing. CleanQuote gives you custom quote forms, pricing structures, a service area builder, and one-click booking so leads say yes while they're hot. Use it standalone or connect your CRM. Embed anywhere. No coding. More booked jobs.
        </p>
        <p className="mt-4 text-sm text-muted-foreground/90 max-w-xl mx-auto">
          Multiple service areas, different pricing per zone—or one structure everywhere. One form. Stop losing leads to “we'll get back to you.”
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow" onClick={onSignupClick}>
            Start 14-day free trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link href="/login">
            <Button size="lg" variant="outline" className="rounded-none border-2 text-base font-semibold shadow-lg shadow-black/5 backdrop-blur-sm">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          14-day free trial · $297/mo after · Cancel anytime · Secure checkout via Stripe
        </p>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className="relative border-t border-white/20 py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-muted/40" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tired of losing leads while you run numbers?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Most cleaning companies quote the old way: back-and-forth emails, manual spreadsheets, and “we'll get back to you.” By the time you send a price, the lead has already moved on. CleanQuote.io is a sales solution that flips that. Your leads get an instant, accurate quote—and you get a hot lead who's ready to book.
        </p>
        <p className="mt-4 text-base font-medium text-foreground">
          Same pricing you use today. One simple form. Way more closed jobs.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { step: '1', title: 'Add your pricing', desc: 'Upload your pricing table or use our template. Square footage, frequency, add-ons—you set the rules.' },
    { step: '2', title: 'Customize your form', desc: 'Build the quote form that fits your business. Address, home size, pets, frequency—only ask what you need.' },
    { step: '3', title: 'Embed and start quoting', desc: 'Drop the widget on your site or share a link. Leads get a price in seconds; you get leads that are ready to book.' },
  ];
  return (
    <section className="relative border-t border-white/20 py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-muted/30" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-center">
          How it works
        </h2>
        <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
          Three steps to faster quotes and more booked jobs.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map(({ step: stepNum, title, desc }) => (
            <div key={stepNum} className="relative rounded-none border-2 border-white/40 bg-white/60 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground text-lg font-bold shadow-md">
                {stepNum}
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Zap,
      title: 'Instant quotes that close',
      description: `Leads see a real price in seconds—no "we'll get back to you." You're not just giving out a number; you're closing. Turn looky-loos into booked jobs, and service the lead from first click to client.`,
    },
    {
      icon: Calendar,
      title: 'Book callbacks & appointments',
      description: `Stop playing phone tag. Let leads pick a time or request a callback. Calendar sync shows only when you're free. Fewer no-shows, more show-ups.`,
    },
    {
      icon: BarChart3,
      title: 'Your pricing, your rules',
      description: 'Upload your real pricing table or import from Excel. Square footage ranges, add-ons, frequency tiers—you control every variable. Initial Cleaning multipliers, people and pet adjusters—quotes stay accurate and on-brand, every time.',
    },
    {
      icon: Sparkles,
      title: 'Embed anywhere',
      description: 'Drop the quote widget on your site, in your funnels, or behind one link. Same experience everywhere. Pass UTM params for tracking. One setup, one brand, more qualified leads.',
    },
  ];

  return (
    <section id="features" className="relative border-t border-white/20 py-20 sm:py-28 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 via-background to-primary/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl drop-shadow-sm">
            Everything you need in one quote solution—quote smarter, close more
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            One solution to capture leads, calculate quotes, and book follow-ups. No spreadsheets, no manual math, no lost leads. Use it in your browser—no download required.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-none border-2 border-white/40 bg-white/60 p-6 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:shadow-primary/15 hover:bg-white/70 hover:border-primary/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-none bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-inner shadow-primary/10">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
          {[
            'Pricing structures—multiple named structures, assign per tool or per service area',
            'Service area builder—draw zones, add by ZIP, or import KML; multiple areas per org',
            'Custom survey questions',
            'Google Maps service area checks',
            'Contacts & pipelines',
            'SMS-ready quote copy',
            'Excel pricing import',
            'Initial Cleaning detection',
            'Appointment & callback booking',
            'Team & subaccounts',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary drop-shadow-sm" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Capabilities() {
  const capabilities = [
    'Build custom quote forms—address, home size, bedrooms, baths, pets, condition, frequency—only ask what you need',
    'Pricing structures—create multiple named structures (e.g. residential vs commercial), import from Excel or build in-app; assign one structure per tool or use different structures for different service areas',
    'Service area builder—draw polygons on the map, add zones by US ZIP code, or import KML/NetworkLink; define multiple service areas per organization and assign them to tools',
    'Per-area pricing—use one pricing structure for one service area and another for a different zone, or the same structure across all areas; qualify leads by location and quote with the right rates',
    'Smart Initial Cleaning—auto-detect based on home condition and cleaning history, with configurable multipliers and conditions',
    'CRM sync—contacts, opportunities, notes, pipelines, custom fields, tags, appointment and callback booking (optional)',
    'Embed anywhere—widget snippet, iframe, or shareable link. Pre-fill forms from your CRM when connected',
    'Google Maps autocomplete and geocoding—accurate addresses, automatic service area checks',
    'Multi-frequency pricing—weekly, bi-weekly, four-week, one-time general and deep clean, move in/move out',
    'Team and subaccounts—invite users, manage multiple quote tools per organization',
  ];

  return (
    <section id="capabilities" className="relative border-t border-white/20 py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-muted/30" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-center">
          Quote solution built for pros—every capability you need
        </h2>
        <p className="mt-4 text-lg text-muted-foreground text-center max-w-2xl mx-auto">
          From pricing to booking to CRM sync, CleanQuote.io gives you the tools to close more jobs—without the spreadsheets. All in a web application you access from any device.
        </p>
        <ul className="mt-10 space-y-4 max-w-2xl mx-auto">
          {capabilities.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pricing({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <section id="pricing" className="relative border-t border-white/20 py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/30 via-background to-muted/20" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Simple, predictable pricing
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Full access to all tools. No hidden fees. Cancel anytime.
        </p>
        <div className="mt-12 inline-block rounded-none border-2 border-primary/30 bg-white/70 p-8 shadow-2xl shadow-primary/10 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="text-left">
              <p className="text-4xl font-bold text-foreground">$297<span className="text-lg font-medium text-muted-foreground">/month</span></p>
              <p className="mt-2 text-sm font-medium text-primary">14-day free trial</p>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                Unlimited quote tools, pricing structures, service area builder, multiple service areas, optional CRM integration, custom surveys, and more.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25" onClick={onSignupClick}>
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is CleanQuote?',
    a: 'CleanQuote is a sales solution with a web application that helps cleaning companies send accurate, instant quotes to leads instead of back-and-forth emails. You get custom quote forms, pricing structures, a service area builder, multiple service areas, and optional CRM sync—all in the browser, no software to download. Use it standalone or connect your CRM.',
  },
  {
    q: 'How does CleanQuote work?',
    a: 'You add your pricing (or import from Excel), set up pricing structures and optional service areas, customize your quote form, then embed the widget on your site or share a link. Leads get an instant price in seconds; you get leads that are ready to book, with optional callback and appointment booking.',
  },
  {
    q: 'What are pricing structures and service areas?',
    a: 'Pricing structures are named pricing tables (e.g. Residential, Commercial) that you create and manage at the organization level. You can have multiple structures and assign different ones to different tools or to different service areas. Service areas are geographic zones you define—by drawing on the map, adding ZIP codes, or importing KML—and assign to tools. When a lead enters an address, CleanQuote can check if they\'re in a service area and apply the right pricing structure for that zone.',
  },
  {
    q: 'Can I have different pricing for different service areas?',
    a: 'Yes. You can create multiple service areas (e.g. downtown vs suburbs) and multiple pricing structures. In each tool\'s settings you assign which service areas apply and, optionally, which pricing structure to use per service area—or one default structure for all. So one zone can use "Residential" rates and another "Premium" or "Commercial" rates. Same tool, different areas, different pricing.',
  },
  {
    q: 'Does CleanQuote work with other CRMs?',
    a: 'CleanQuote works as a standalone sales hub—quote, capture leads, and book callbacks or appointments in one place. You can also connect it to your CRM (e.g. HighLevel) to sync contacts, opportunities, and calendars. Integration is optional.',
  },
  {
    q: 'How much does CleanQuote cost?',
    a: '$297/month after a 14-day free trial. You get unlimited quote tools, pricing structures, service area builder, multiple service areas, optional CRM integration, custom surveys, Google Maps, and more. Cancel anytime.',
  },
  {
    q: 'Can I use my own pricing with CleanQuote?',
    a: 'Yes. Create one or more pricing structures—upload from Excel or build in the pricing structure builder. Square footage ranges, frequency tiers (weekly, bi-weekly, 4-week), add-ons, and Initial Cleaning multipliers are all configurable. You can assign different structures to different tools or different service areas so quotes always use the right rates.',
  },
  {
    q: 'How do I embed the quote form on my website?',
    a: 'Add the CleanQuote widget snippet to your site, use an iframe, or share a direct link. You can pass UTM params for tracking and use a custom domain for your quote links. Same experience everywhere—your brand, your pricing.',
  },
];

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

function FAQ() {
  return (
    <section id="faq" className="relative border-t border-white/20 py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-muted/20" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-center">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-muted-foreground text-center">
          Quick answers about the CleanQuote.io sales solution
        </p>
        <dl className="mt-12 space-y-6">
          {FAQ_ITEMS.map(({ q, a }) => (
            <div key={q} className="rounded-none border border-white/40 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
              <dt className="font-semibold text-foreground">{q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function CTA({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/10 via-background to-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,hsl(270_65%_55%_/_0.15),transparent)]" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="rounded-none border-2 border-white/30 bg-white/50 p-10 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl drop-shadow-sm">
            Ready to close more leads?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            More closed jobs, less chasing. Use CleanQuote standalone or with your CRM—we handle the sale. Start your 14-day free trial. $297/month after—cancel anytime.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow" onClick={onSignupClick}>
              Sign up — Start free trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-none border-2 text-base font-semibold shadow-lg shadow-black/5">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onSignupClick }: { onSignupClick: () => void }) {
  return (
    <footer className="border-t border-white/20 bg-white/50 py-10 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs text-center sm:text-left">
              Sales solution for cleaning companies. Instant quoting via web app—close more leads, book more jobs.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:gap-6" aria-label="Footer navigation">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              Capabilities
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
            <Link href="/help" className="hover:text-foreground transition-colors">
              Help
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            <button onClick={onSignupClick} className="font-medium text-primary hover:underline">
              Sign up
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function MarketingPageContent() {
  const searchParams = useSearchParams();
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  // Open signup modal when arriving from login "Sign up" link (?signup=1)
  useEffect(() => {
    if (searchParams?.get('signup') === '1') {
      setSignupModalOpen(true);
      // Remove ?signup=1 from URL so the modal can be closed without it reopening
      const url = new URL(window.location.href);
      url.searchParams.delete('signup');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSignupClick={() => setSignupModalOpen(true)} />
      <main className="flex-1">
        <Hero onSignupClick={() => setSignupModalOpen(true)} />
        <WhySection />
        <HowItWorks />
        <Features />
        <Capabilities />
        <Pricing onSignupClick={() => setSignupModalOpen(true)} />
        <FAQ />
        <CTA onSignupClick={() => setSignupModalOpen(true)} />
      </main>
      <Footer onSignupClick={() => setSignupModalOpen(true)} />
      <SignupModal open={signupModalOpen} onOpenChange={setSignupModalOpen} />
    </div>
  );
}

export default function MarketingPage() {
  useEffect(() => {
    debugLog('MarketingPage.tsx:MarketingPage-mount', 'MarketingPage mounted', { path: typeof window !== 'undefined' ? window.location.pathname : 'ssr' });
  }, []);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header onSignupClick={() => {}} />
        <main className="flex-1">
          <Hero onSignupClick={() => {}} />
          <WhySection />
          <HowItWorks />
          <Features />
          <Capabilities />
          <Pricing onSignupClick={() => {}} />
          <FAQ />
          <CTA onSignupClick={() => {}} />
        </main>
        <Footer onSignupClick={() => {}} />
      </div>
    }>
      <MarketingPageContent />
    </Suspense>
  );
}
