'use client';

import './globals.css';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const stripeCheckoutUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL ?? '';
const getStartedHref = stripeCheckoutUrl.startsWith('http') ? stripeCheckoutUrl : '/signup';
const isStripeCheckout = getStartedHref !== '/signup';

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="rounded-none font-medium">
              Log in
            </Button>
          </Link>
          {isStripeCheckout ? (
            <a href={getStartedHref} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-none font-medium">
                Sign up
              </Button>
            </a>
          ) : (
            <Link href={getStartedHref}>
              <Button size="sm" className="rounded-none font-medium">
                Sign up
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Layered gradients + soft orbs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background via-40% to-primary/15" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl -z-10" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/15 blur-3xl -z-10" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-none border-2 border-primary/30 bg-white/60 px-4 py-1.5 text-sm font-medium text-primary shadow-lg shadow-primary/20 backdrop-blur-md">
          <Sparkles className="h-4 w-4" />
          CleanQuote.io — Smart quoting for cleaning companies
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Turn leads into quotes{' '}
          <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">in seconds</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
          Stop losing leads to slow back-and-forth. CleanQuote.io gives you custom quote forms, instant pricing, and one-click booking—so you close more jobs while your competitors are still typing emails.
        </p>
        <p className="mt-4 text-sm text-muted-foreground/90 max-w-xl mx-auto">
          Connect to GoHighLevel, use your own pricing, and embed your quote widget anywhere. No coding. No guesswork. Just more booked jobs.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isStripeCheckout ? (
            <a href={getStartedHref} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow">
                Start 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          ) : (
            <Link href={getStartedHref}>
              <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow">
                Start 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link href="/login">
            <Button size="lg" variant="outline" className="rounded-none border-2 text-base font-semibold shadow-lg shadow-black/5 backdrop-blur-sm">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          14-day free trial · $297/mo after · Cancel anytime{isStripeCheckout ? ' · Secure checkout via Stripe' : ''}
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
          Most cleaning companies quote the old way: back-and-forth emails, manual spreadsheets, and “we’ll get back to you.” By the time you send a price, the lead has already moved on. CleanQuote.io flips that. Your leads get an instant, accurate quote—and you get a hot lead who’s ready to book.
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
      description: 'Leads see a real price in seconds—no “we’ll get back to you.” Faster answers mean more yeses and fewer drop-offs. Turn looky-loos into booked jobs.',
    },
    {
      icon: Calendar,
      title: 'Book callbacks & appointments',
      description: 'Stop playing phone tag. Let leads pick a time or request a callback. Sync with your calendar and show only when you’re free. Fewer no-shows, more show-ups.',
    },
    {
      icon: BarChart3,
      title: 'Your pricing, your rules',
      description: 'Upload your real pricing table. Square footage, add-ons, frequency—you control every variable. Quotes stay accurate and on-brand, every time.',
    },
    {
      icon: Sparkles,
      title: 'Embed anywhere',
      description: 'Drop the quote widget on your site, in GHL funnels, or behind one link. Same experience everywhere. One setup, one brand, more qualified leads.',
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
            Everything you need to quote smarter—and close more
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            One tool to capture leads, calculate quotes, and book follow-ups. No spreadsheets, no manual math, no lost leads.
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
            'Custom survey questions',
            'Google Maps service area',
            'GHL contacts & pipelines',
            'SMS-ready quote copy',
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

function Pricing() {
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
                Unlimited quote tools, GHL integration, custom surveys, service areas, and more.
              </p>
            </div>
            <div className="flex-shrink-0">
              {isStripeCheckout ? (
                <a href={getStartedHref} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25">
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Link href={getStartedHref}>
                  <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25">
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
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
            Start your 14-day free trial. Full access to quote tools, GHL integration, and more. $297/month after trial—cancel anytime.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isStripeCheckout ? (
              <a href={getStartedHref} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow">
                  Sign up — Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            ) : (
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 rounded-none text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-shadow">
                  Sign up — Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
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

function Footer() {
  return (
    <footer className="border-t border-white/20 bg-white/50 py-10 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs text-center sm:text-left">
              Instant quoting for cleaning companies. Close more leads, book more jobs.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            {isStripeCheckout ? (
              <a href={getStartedHref} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Sign up
              </a>
            ) : (
              <Link href={getStartedHref} className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <WhySection />
        <HowItWorks />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
