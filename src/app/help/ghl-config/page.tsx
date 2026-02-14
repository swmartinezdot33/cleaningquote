import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Advanced Configuration (CRM & Webhooks)',
  description:
    'Guide to Advanced Configuration in CleanQuote: CRM behavior (contacts, notes, opportunities, pipelines, calendars, tags), form behavior, and webhooks for Zapier or other CRMs.',
};

export default function GHLConfigHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Advanced Configuration', path: '/help/ghl-config' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Advanced Configuration</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Advanced Configuration: CRM, Form Behavior &amp; Webhooks</h1>
      <p className="text-muted-foreground">
        The <strong className="text-foreground">Advanced Configuration</strong> card in Tool Settings controls what happens when quotes and bookings are submitted: CRM behavior (HighLevel contacts, notes, opportunities, pipelines, calendars, tags), form behavior (iframe pre-fill, internal tool mode), and <strong className="text-foreground">webhooks</strong> for Zapier or other CRMs. Set your CRM connection (API token and Location ID) in <strong className="text-foreground">Dashboard → Settings → HighLevel Integration</strong> first; this card is per-tool.
      </p>

      <h2 id="when-to-use" className="text-lg font-semibold text-foreground mt-8">Where to find these settings</h2>
      <p className="text-foreground">
        Go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong> → your tool → <strong className="text-foreground">Settings</strong>. The settings are grouped into cards: <strong className="text-foreground">Site Customization</strong>, <strong className="text-foreground">Pricing Structure</strong>, <strong className="text-foreground">Service Area(s)</strong>, <strong className="text-foreground">Query Parameters &amp; Tracking</strong>, and <strong className="text-foreground">Advanced Configuration</strong>. Expand <strong className="text-foreground">Advanced Configuration</strong> to access CRM, form behavior, and webhook options. Each section below matches the card.
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

      <h2 id="quoted-amount-field" className="text-lg font-semibold text-foreground mt-8">Quoted amount field (contact custom field)</h2>
      <p className="text-foreground">
        The HighLevel <strong>contact</strong> custom field where the quoted amount is stored (e.g. <code className="bg-muted px-1 rounded">quoted_cleaning_price</code>). Use the search box to find your field by name or key; type to narrow the list. The field must exist in your location as a numeric or currency custom field.
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

      <h2 id="form-behavior" className="text-lg font-semibold text-foreground mt-8">Form behavior</h2>
      <p className="text-foreground">
        Settings that affect how the quote form behaves when embedded or used internally.
      </p>
      <ul className="list-disc list-inside space-y-1 text-foreground mt-2">
        <li><strong className="text-foreground">Form is iframed (pre-fill from GHL):</strong> When the form is embedded in your CRM or site with a contact ID in the URL, CleanQuote fetches name, phone, email, and address from the CRM and lands the user on the address step. Use the iframe URL with <code className="bg-muted px-1 rounded">?contactId=&#123;&#123;Contact.Id&#125;&#125;</code> (or your CRM&apos;s contact ID placeholder).</li>
        <li><strong id="internal-tool-only" className="text-foreground">Internal tool only:</strong> Contact info is collected at the end (optional Save quote and create contact). The quote summary is streamlined: Book an appointment remains available; Schedule a callback is not shown. Use for internal quoting (e.g. office staff) rather than customer-facing booking.</li>
      </ul>

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

      <h2 id="disqualified-lead-tags" className="text-lg font-semibold text-foreground mt-8">Disqualified lead tags</h2>
      <p className="text-foreground">
        Tags applied to the contact when they select a &quot;disqualify&quot; option in the survey (e.g. out of scope, not interested). Use to segment or automate follow-up for disqualified leads.
      </p>

      <h2 id="webhooks" className="text-lg font-semibold text-foreground mt-8">Webhooks (Zapier or other CRMs)</h2>
      <p className="text-foreground">
        If you use Zapier, Make, or another CRM instead of (or in addition to) HighLevel, you can send events to a webhook URL. Turn on <strong className="text-foreground">Enable webhook</strong> and enter your webhook URL (e.g. a Zapier catch hook). CleanQuote will POST a JSON payload to that URL when any of these events occur:
      </p>
      <ul className="list-disc list-inside space-y-1 text-foreground mt-2">
        <li><strong className="text-foreground">out_of_service_area</strong> — Address is outside your service area (from the service area check, or when the out-of-service form is submitted).</li>
        <li><strong className="text-foreground">in_service_area</strong> — Address is inside your service area (from the service area check).</li>
        <li><strong className="text-foreground">quote_summary_viewed</strong> — Customer reached the quote result/summary page.</li>
        <li><strong className="text-foreground">appointment_booked</strong> — Customer successfully booked an appointment (or call).</li>
      </ul>
      <p className="text-foreground mt-2">
        Each payload includes <code className="bg-muted px-1 rounded">event</code>, <code className="bg-muted px-1 rounded">toolId</code>, <code className="bg-muted px-1 rounded">timestamp</code> (ISO string), and event-specific data (e.g. <code className="bg-muted px-1 rounded">inServiceArea</code>, <code className="bg-muted px-1 rounded">lat</code>/<code className="bg-muted px-1 rounded">lng</code> for service area; <code className="bg-muted px-1 rounded">contactId</code>, <code className="bg-muted px-1 rounded">appointmentId</code>, <code className="bg-muted px-1 rounded">date</code>, <code className="bg-muted px-1 rounded">time</code> for appointment booked). Use these in Zapier or your automation to trigger workflows.
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        Need to set up the connection first? Add your PIT token and Location ID in <strong className="text-foreground">Settings → HighLevel Integration</strong>. See <Link href="/help/ghl-integration" className="text-primary hover:underline">HighLevel integration (PIT token &amp; Location ID)</Link>.
      </p>
    </article>
  );
}
