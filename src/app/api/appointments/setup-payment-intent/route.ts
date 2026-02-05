import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServer } from '@/lib/supabase/server';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();

async function resolveToolId(toolSlug: string | undefined, toolIdParam: string | undefined): Promise<string | undefined> {
  if (toolIdParam && typeof toolIdParam === 'string' && toolIdParam.trim()) return toolIdParam.trim();
  if (!toolSlug || typeof toolSlug !== 'string' || !toolSlug.trim()) return undefined;
  const supabase = createSupabaseServer();
  const { data } = await supabase.from('tools').select('id').eq('slug', toolSlug.trim()).maybeSingle();
  return (data as { id: string } | null)?.id ?? undefined;
}

/**
 * Create a Stripe SetupIntent for capturing payment method (pre-auth) without charging.
 * Used on the appointment review step so the business can charge the customer later.
 */
export async function POST(request: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Payment capture is not configured.', clientSecret: null },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { toolSlug, toolId: toolIdParam } = body;

    await resolveToolId(toolSlug, toolIdParam);

    const stripe = new Stripe(stripeSecret);

    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      payment_method_types: ['card'],
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('SetupIntent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment form.', clientSecret: null },
      { status: 500 }
    );
  }
}
