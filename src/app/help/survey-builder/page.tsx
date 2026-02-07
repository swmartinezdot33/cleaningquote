import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Survey builder',
  description:
    'Add, edit, and reorder quote form questions in CleanQuote and map them to HighLevel fields for lead sync.',
};

export default function SurveyBuilderHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Survey builder', path: '/help/survey-builder' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Survey builder</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Survey Builder</h1>
      <p className="text-muted-foreground">
        Use this guide to customize your quote form questions in CleanQuote. Add, edit, reorder questions, and map them to HighLevel fields so leads sync correctly.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Where to find the Survey Builder</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong>.
        </li>
        <li>
          Select your quoting tool.
        </li>
        <li>
          Open the <strong className="text-foreground">Survey</strong> tab.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Adding a custom question</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Click <strong className="text-foreground">Add Question</strong>.
        </li>
        <li>
          Fill in the label (the question text users will see).
        </li>
        <li>
          Choose the field type: <strong className="text-foreground">text</strong>, <strong className="text-foreground">email</strong>, <strong className="text-foreground">tel</strong>, <strong className="text-foreground">number</strong>, <strong className="text-foreground">select</strong>, or <strong className="text-foreground">address</strong>.
        </li>
        <li>
          For select fields, add the options (one per line).
        </li>
        <li>
          Optional: map the question to a HighLevel custom field in <strong className="text-foreground">Field Mapping</strong>.
        </li>
        <li>
          Click <strong className="text-foreground">Save Question</strong>.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. Editing and reordering questions</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground ml-2">
        <li>
          <strong className="text-foreground">Edit</strong> — Click the edit (pencil) icon on a question to change its label, type, options, or GHL mapping.
        </li>
        <li>
          <strong className="text-foreground">Reorder</strong> — Use the up/down arrows to move questions.
        </li>
        <li>
          <strong className="text-foreground">Delete</strong> — Custom questions can be deleted. Core questions (e.g. First Name, Email, Square Footage) cannot be deleted.
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-foreground mt-8">4. Core fields (protected)</h2>
      <p className="text-foreground">
        Some fields are required for quote calculations and HighLevel sync. These cannot be deleted or have their type changed:
      </p>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 mt-2">
        <li>First Name, Last Name, Email, Phone, Service Address</li>
        <li>Square Footage, Service Type, Cleaning Frequency</li>
        <li>Full Bathrooms, Half Bathrooms, Bedrooms</li>
        <li>Home Condition</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-2">
        You can still edit their labels, placeholders, and GHL mappings.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">5. Field Mapping</h2>
      <p className="text-foreground">
        To sync survey answers to HighLevel contacts, map questions to GHL custom fields. The system validates compatibility between question type and GHL field type. Critical mappings (e.g. Service Type, Frequency, Condition) must stay correct for quotes to sync properly.
      </p>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
