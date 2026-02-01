import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'HighLevel Config',
  description:
    'Guide to every HighLevel Config setting in CleanQuote: contacts, notes, opportunities, pipelines, calendars, and tags when a quote is submitted.',
};

export default function GHLConfigHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'HighLevel Config', path: '/help/ghl-config' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">HighLevel Config</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">HighLevel Config: Every Setting Explained</h1>
      <p className="text-muted-foreground">
        HighLevel Config controls what happens in your CRM when a customer submits a quote. Save your HighLevel connection (API token and Location ID) in the <strong className="text-foreground">HighLevel Integration</strong> section first, then use this guide to understand each option.
      </p>

      <h2 id="when-to-use" className="text-lg font-semibold text-foreground mt-8">When to use HighLevel Config</h2>
      <p className="text-foreground">
        Go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong> → your tool → <strong className="text-foreground">Settings</strong>. Expand the <strong className="text-foreground">HighLevel Config</strong> card. Each setting below corresponds to a checkbox, dropdown, or field in that card.
      </p>

      <h2 id="create-contact" className="text-lg font-semibold text-foreground mt-8">Create/update contact</h2>
      <p className="text-foreground">
        When enabled, CleanQuote creates or updates a contact in HighLevel using the customer&apos;s name, email, phone, and address from the quote form. The contact is linked to the opportunity and note so you have one record per lead.
      </p>

      <h2 id="create-note" className="text-lg font-semibold text-foreground mt-8">Create note</h2>
      <p className="text-foreground">
        When enabled, a note is added to the contact (or opportunity) with a summary of the quote: selected services, pricing, and any form answers. Useful for quick follow-up without reopening the quote.
      </p>

      <h2 id="create-quote-object" className="text-lg font-semibold text-foreground mt-8">Create Quote (custom object)</h2>
      <p className="text-foreground">
        When enabled, CleanQuote creates a Quote custom object in HighLevel with the full quote details. Use this if you have a custom object schema for quotes in HighLevel and want to sync structured data (e.g. for reporting or workflows).
      </p>

      <h2 id="create-opportunity" className="text-lg font-semibold text-foreground mt-8">Create opportunity</h2>
      <p className="text-foreground">
        When enabled, a sales opportunity is created in HighLevel and linked to the contact. You can choose the default pipeline and stage, and optionally route opportunities to different pipelines based on UTM parameters (e.g. <code className="bg-muted px-1 rounded">utm_source=google</code>).
      </p>

      <h2 id="default-pipeline" className="text-lg font-semibold text-foreground mt-8">Default Pipeline and Default Starting Stage</h2>
      <p className="text-foreground">
        If <strong className="text-foreground">Create opportunity</strong> is on, these set which pipeline and stage new opportunities use when no UTM routing rule matches. Create a pipeline in HighLevel first; CleanQuote will list your pipelines and their stages in the dropdowns.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Pipeline Routing by UTM</h2>
      <p className="text-foreground">
        Optional rules that send opportunities to different pipelines or stages based on URL parameters. For example: when <code className="bg-muted px-1 rounded">utm_source</code> contains <code className="bg-muted px-1 rounded">google</code>, use pipeline &quot;Paid Ads&quot; and stage &quot;New Lead.&quot; First matching rule wins; match type can be <strong className="text-foreground">contains</strong>, <strong className="text-foreground">equals</strong>, or <strong className="text-foreground">starts_with</strong>. You can also set per-rule opportunity status, assigned user, source, and tags.
      </p>

      <h2 id="quoted-amount-value" className="text-lg font-semibold text-foreground mt-8">Use quoted amount for opportunity value</h2>
      <p className="text-foreground">
        When enabled, the opportunity&apos;s value in HighLevel is set to the quoted total from CleanQuote. This helps with pipeline value and reporting.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Quoted amount field (HighLevel custom field key)</h2>
      <p className="text-foreground">
        The HighLevel custom field key where the quoted amount is stored (e.g. <code className="bg-muted px-1 rounded">quoted_amount</code>). Must be a numeric or currency field in your location. You can type the key or pick from existing opportunity custom fields if CleanQuote has loaded them.
      </p>

      <h2 id="opportunity-assigned-to" className="text-lg font-semibold text-foreground mt-8">Opportunity assigned to</h2>
      <p className="text-foreground">
        The HighLevel user (team member) to assign new opportunities to by default. Only applies when not overridden by a UTM routing rule.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Opportunity source</h2>
      <p className="text-foreground">
        A label for where the opportunity came from (e.g. &quot;Quote Widget&quot;, &quot;Website&quot;). Stored in HighLevel&apos;s opportunity source field for reporting and segmentation.
      </p>

      <h2 id="opportunity-tags" className="text-lg font-semibold text-foreground mt-8">Opportunity tags</h2>
      <p className="text-foreground">
        Tags applied to the opportunity in HighLevel. Use for segmentation, automation, or reporting (e.g. &quot;quote&quot;, &quot;cleaning&quot;). You can search existing HighLevel tags or type new ones.
      </p>

      <h2 id="calendars" className="text-lg font-semibold text-foreground mt-8">Appointment calendar and Call calendar</h2>
      <p className="text-foreground">
        The HighLevel calendars used when a lead books an appointment or requests a callback from the quote flow. Select the calendar that should receive the booking. CleanQuote shows only calendars your API token can access.
      </p>

      <h2 id="calendar-users" className="text-lg font-semibold text-foreground mt-8">Appointment user and Call user</h2>
      <p className="text-foreground">
        The HighLevel user whose availability is shown for that calendar. Often one user per calendar; select the user that owns the appointment or call calendar you chose above.
      </p>

      <h2 id="redirect-after-appointment" className="text-lg font-semibold text-foreground mt-8">Redirect after appointment booking / Appointment redirect URL</h2>
      <p className="text-foreground">
        When <strong className="text-foreground">Redirect after appointment booking</strong> is on, the customer is sent to the URL you enter (e.g. a thank-you page) after they confirm an appointment. Leave blank to stay on the CleanQuote confirmation screen.
      </p>

      <h2 id="service-area-tags" className="text-lg font-semibold text-foreground mt-8">In-service tags and Out-of-service tags</h2>
      <p className="text-foreground">
        Tags applied to the contact when their address is inside (in-service) or outside (out-of-service) your service area polygon. Useful for filtering leads by coverage or triggering different follow-up in HighLevel.
      </p>

      <h2 id="appointment-booked-tags" className="text-lg font-semibold text-foreground mt-8">Appointment booked tags</h2>
      <p className="text-foreground">
        Tags applied to the contact when they successfully book an appointment from the quote flow. Use for automation (e.g. send confirmation) or reporting.
      </p>

      <h2 id="quote-completed-tags" className="text-lg font-semibold text-foreground mt-8">Quote completed tags</h2>
      <p className="text-foreground">
        Tags applied to the contact when they complete the quote (reach the quote result page). Use to segment &quot;got a quote&quot; leads from general inquiries.
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        Need to set up the connection first? See <Link href="/help/ghl-integration" className="text-primary hover:underline">HighLevel integration (PIT token &amp; Location ID)</Link>.
      </p>
    </article>
  );
}
