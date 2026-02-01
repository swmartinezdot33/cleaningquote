import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Pricing structure builder',
  description:
    'Create pricing tiers manually or import from Excel in CleanQuote so your quote form calculates prices correctly.',
};

export default function PricingStructureBuilderHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Pricing structure builder', path: '/help/pricing-structure-builder' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Pricing structure builder</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Pricing Structure Builder</h1>
      <p className="text-muted-foreground">
        Use this guide to set up your quoting prices in CleanQuote. You can build pricing manually or import from an Excel file.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Where to find the Pricing Builder</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong>.
        </li>
        <li>
          Select your quoting tool.
        </li>
        <li>
          Open the <strong className="text-foreground">Pricing</strong> tab.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Two ways to build your pricing</h2>

      <h3 className="text-base font-semibold text-foreground mt-6">Option A: Build manually</h3>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Click <strong className="text-foreground">Build Pricing Structure</strong>.
        </li>
        <li>
          Click <strong className="text-foreground">Add Tier</strong> or <strong className="text-foreground">Create Your First Pricing Tier</strong>.
        </li>
        <li>
          For each tier, set the <strong className="text-foreground">Square footage range</strong> (min and max, e.g. 0–1500, 1501–2000).
        </li>
        <li>
          Enter price ranges for each service: <strong className="text-foreground">Weekly</strong>, <strong className="text-foreground">Bi-Weekly</strong>, <strong className="text-foreground">4 Week</strong>, <strong className="text-foreground">General</strong>, <strong className="text-foreground">Deep</strong>, <strong className="text-foreground">Move In/Out Basic</strong>, <strong className="text-foreground">Move In/Out Deep</strong>. Use formats like <code className="bg-muted px-1 rounded">$135-$165</code> or <code className="bg-muted px-1 rounded">$1,000-$1,200</code>.
        </li>
        <li>
          Add more tiers as needed.
        </li>
        <li>
          Click <strong className="text-foreground">Save Pricing Structure</strong>.
        </li>
      </ol>

      <h3 className="text-base font-semibold text-foreground mt-6">Option B: Import from Excel</h3>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Click <strong className="text-foreground">Import from Excel</strong>.
        </li>
        <li>
          Download the pricing template to see the expected format.
        </li>
        <li>
          Your Excel file must have a sheet named <strong className="text-foreground">Sheet1</strong>, a header row, and price ranges in formats like <code className="bg-muted px-1 rounded">$55-$75</code> or <code className="bg-muted px-1 rounded">$1150 - $1350</code>.
        </li>
        <li>
          Column headers: <strong className="text-foreground">SqFt Range</strong> (e.g. &quot;Less Than 1500&quot;, &quot;1501-2000&quot;), <strong className="text-foreground">Weekly</strong>, <strong className="text-foreground">Bi-Weekly</strong>, <strong className="text-foreground">4 Week</strong>, <strong className="text-foreground">General</strong>, <strong className="text-foreground">Deep</strong>, <strong className="text-foreground">Move in/out BASIC</strong>, <strong className="text-foreground">Move in/out FULL</strong>.
        </li>
        <li>
          Choose your Excel file and upload. The system parses it and stores the pricing.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. How pricing is used</h2>
      <p className="text-foreground">
        Quotes use the customer&apos;s square footage to pick the right tier. People and shedding-pet multipliers are applied to the base price. Addresses outside your maximum tier show an out-of-limits message instead of a price.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">4. Viewing your structure</h2>
      <p className="text-foreground">
        Click <strong className="text-foreground">View Structure</strong> to see all tiers and prices in a table. Use <strong className="text-foreground">Edit Pricing</strong> to change them.
      </p>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
