import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM ?? 'CleanQuote.io <noreply@cleanquote.io>';

function getBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && env.startsWith('http')) return env.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel && !vercel.startsWith('http')) return `https://${vercel}`;
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.cleanquote.io';
}

function slugFromEmail(email: string): string {
  const part = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'org';
  return part + '-' + Date.now().toString(36).slice(-6);
}

/** Send confirmation email with set-password link after checkout (optional; requires RESEND_API_KEY). */
async function sendCheckoutConfirmationEmail(email: string, setPasswordLink: string): Promise<void> {
  if (!resendApiKey?.trim()) return;
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const dashboardUrl = `${baseUrl}/dashboard`;
  try {
    const resend = new Resend(resendApiKey.trim());
    await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: 'Your CleanQuote account is ready',
      html: `
        <p>Thanks for subscribing. Your account has been created.</p>
        <p><strong>Set your password and sign in:</strong></p>
        <p><a href="${setPasswordLink}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Set password & sign in</a></p>
        <p>Or copy this link: ${setPasswordLink}</p>
        <p>After signing in you can access your dashboard at <a href="${dashboardUrl}">${dashboardUrl}</a>.</p>
        <p>If you didn’t expect this email, you can ignore it.</p>
      `,
    });
  } catch (err) {
    console.error('Stripe webhook: failed to send checkout confirmation email:', err);
  }
}

/** Find Supabase user id by email (admin listUsers) */
async function findUserIdByEmail(admin: ReturnType<typeof createSupabaseServer>, email: string): Promise<string | null> {
  let page = 0;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) return null;
    const user = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createSupabaseServer();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
        const email = (session.customer_details?.email ?? session.customer_email ?? '').toString().trim().toLowerCase();
        if (!email) {
          return NextResponse.json({ error: 'No email in session' }, { status: 400 });
        }
        if (!customerId) {
          return NextResponse.json({ error: 'No customer in session' }, { status: 400 });
        }
        // Subscription required for platform access
        if (!subscriptionId) {
          return NextResponse.json({ received: true });
        }

        let userId: string;
        let isNewUser = false;
        const { data: existingUser, error: createError } = await admin.auth.admin.createUser({
          email,
          password: crypto.randomUUID().replace(/-/g, '') + 'A1!',
          email_confirm: true,
        });
        if (createError) {
          if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
            const found = await findUserIdByEmail(admin, email);
            if (!found) return NextResponse.json({ error: 'User exists but could not resolve' }, { status: 500 });
            userId = found;
          } else {
            return NextResponse.json({ error: createError.message }, { status: 400 });
          }
        } else {
          userId = existingUser.user!.id;
          isNewUser = true;
        }

        const slug = slugFromEmail(email);
        const { data: org, error: orgErr } = await admin
          .from('organizations')
          .insert({
            name: 'Personal',
            slug,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
          } as any)
          .select('id')
          .single();
        if (orgErr || !org) {
          return NextResponse.json({ error: orgErr?.message ?? 'Failed to create org' }, { status: 500 });
        }
        const orgId = (org as { id: string }).id;
        await admin.from('organization_members').insert({ org_id: orgId, user_id: userId, role: 'admin' } as any);
        // Optionally fetch subscription to set trialing vs active
        try {
          const stripe = new Stripe(stripeSecret);
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin.from('organizations') as any).update({ subscription_status: sub.status }).eq('id', orgId);
        } catch {
          // keep default 'active'
        }

        // Send confirmation email with set-password link for new purchasers (optional; requires RESEND_API_KEY)
        if (isNewUser) {
          try {
            const baseUrl = getBaseUrl();
            const { data: linkData } = await admin.auth.admin.generateLink({
              type: 'recovery',
              email,
              options: { redirectTo: `${baseUrl}/dashboard` },
            });
            const actionLink = linkData?.properties?.action_link;
            if (typeof actionLink === 'string' && actionLink) {
              await sendCheckoutConfirmationEmail(email, actionLink);
            }
          } catch (emailErr) {
            console.error('Stripe webhook: generate/send confirmation email:', emailErr);
          }
        }

        return NextResponse.json({ received: true });
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
        if (!customerId) return NextResponse.json({ received: true });
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;
        const { error } = await (admin.from('organizations') as any)
          .update({ stripe_subscription_id: subscription.id, subscription_status: status })
          .eq('stripe_customer_id', customerId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ received: true });
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) return NextResponse.json({ received: true });
        const stripe = new Stripe(stripeSecret);
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
        if (!customerId) return NextResponse.json({ received: true });
        await (admin.from('organizations') as any)
          .update({ subscription_status: sub.status })
          .eq('stripe_customer_id', customerId);
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
