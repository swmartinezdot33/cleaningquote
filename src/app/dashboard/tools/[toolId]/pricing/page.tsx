import { redirect } from 'next/navigation';

/**
 * Pricing is managed at the org level under the Pricing menu.
 * Redirect direct links to the Pricing page.
 */
export default async function ToolPricingPage() {
  redirect('/dashboard/pricing-structures');
}
