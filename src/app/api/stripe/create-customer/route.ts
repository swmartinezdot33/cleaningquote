import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSiteUrl } from '@/lib/canonical-url';

export const dynamic = 'force-dynamic';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const priceId = process.env.STRIPE_PRICE_ID?.trim();

/**
 * Create Stripe customer and redirect to checkout or payment link.
 * Does NOT create Supabase user or org — those are created only in the webhook
 * after payment is completed (checkout.session.completed or customer.subscription.created).
 */
export async function POST(request: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, businessName } = body;

    if (!email || !firstName || !lastName || !phone || !businessName) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, phone, businessName' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecret);

    // Create/update Stripe customer only. No Supabase account until payment completes (webhook).
    // Check if customer already exists with this email
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      // Update existing customer with latest info
      customer = await stripe.customers.update(existingCustomers.data[0].id, {
        name: `${firstName} ${lastName}`,
        phone,
        description: businessName,
        metadata: {
          firstName,
          lastName,
          businessName,
          fullName: `${firstName} ${lastName}`,
          businessEmail: email,
          source: 'cleanquote_signup',
        },
      });
      console.log('Stripe customer updated:', { customerId: customer.id, email });
    } else {
      // Create new Stripe customer with full business information
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        phone,
        description: businessName,
        metadata: {
          firstName,
          lastName,
          businessName,
          fullName: `${firstName} ${lastName}`,
          businessEmail: email,
          source: 'cleanquote_signup',
        },
      });
      console.log('Stripe customer created:', { customerId: customer.id, email });
    }

    // Create a Checkout Session tied to this customer
    const baseUrl = getSiteUrl();
    
    // Use price ID if configured, otherwise use payment link redirect
    if (priceId) {
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
        },
        success_url: `${baseUrl}/subscribe/success`,
        cancel_url: `${baseUrl}?checkout=cancelled`,
        allow_promotion_codes: true,
      });

      console.log('Stripe checkout session created:', { sessionId: session.id, url: session.url });

      return NextResponse.json({
        customerId: customer.id,
        email: customer.email,
        checkoutUrl: session.url,
      });
    } else {
      // Fallback: redirect to payment link. User completes payment on Stripe; webhook creates account after subscription exists.
      const paymentLinkUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL?.trim();
      if (paymentLinkUrl) {
        const url = new URL(paymentLinkUrl);
        url.searchParams.set('prefilled_email', email);
        url.searchParams.set('client_reference_id', customer.id);

        return NextResponse.json({
          customerId: customer.id,
          email: customer.email,
          checkoutUrl: url.toString(),
        });
      }
      
      return NextResponse.json({
        customerId: customer.id,
        email: customer.email,
        error: 'No checkout URL configured',
      });
    }
  } catch (err) {
    console.error('Failed to create Stripe customer/session:', err);
    const message = err instanceof Error ? err.message : 'Failed to create customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
