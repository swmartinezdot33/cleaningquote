import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();

export async function POST(request: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, company } = body;

    if (!email || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, phone' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecret);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        firstName,
        lastName,
        ...(company && { company }),
        source: 'cleanquote_signup',
      },
    });

    return NextResponse.json({
      customerId: customer.id,
      email: customer.email,
    });
  } catch (err) {
    console.error('Failed to create Stripe customer:', err);
    const message = err instanceof Error ? err.message : 'Failed to create customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
