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

/** Create Supabase user + org + membership from Stripe. One org per subscription; same user can have multiple orgs (multiple subscriptions). Idempotent. */
async function ensureUserAndOrgFromStripe(
  admin: ReturnType<typeof createSupabaseServer>,
  email: string,
  customerId: string,
  subscriptionId: string,
  subscriptionStatus: string,
  stripe: Stripe
): Promise<{ userId: string; orgId: string; isNewUser: boolean } | null> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return null;

  // Already have an org for this subscription (e.g. checkout ran first); just update status and ensure user is member
  const { data: existingOrg } = await (admin.from('organizations') as any)
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (existingOrg) {
    const orgId = (existingOrg as { id: string }).id;
    await (admin.from('organizations') as any)
      .update({ stripe_customer_id: customerId, subscription_status: subscriptionStatus })
      .eq('id', orgId);
    const found = await findUserIdByEmail(admin, emailNorm);
    if (found) {
      await (admin.from('organization_members') as any)
        .upsert({ org_id: orgId, user_id: found, role: 'admin' }, { onConflict: 'org_id,user_id' } as any);
    }
    const { data: member } = await (admin.from('organization_members') as any)
      .select('user_id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();
    const userId = (member as { user_id: string } | null)?.user_id ?? found ?? '';
    return { userId, orgId, isNewUser: false };
  }

  let userId: string;
  let isNewUser = false;
  const { data: existingUser, error: createError } = await admin.auth.admin.createUser({
    email: emailNorm,
    password: crypto.randomUUID().replace(/-/g, '') + 'A1!',
    email_confirm: true,
  });
  if (createError) {
    if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
      const found = await findUserIdByEmail(admin, emailNorm);
      if (!found) return null;
      userId = found;
    } else {
      console.error('Stripe webhook: createUser failed', createError.message);
      return null;
    }
  } else {
    userId = existingUser!.user!.id;
    isNewUser = true;
  }

  // New subscription = new org ($297/org). Same user (email) can have multiple orgs.
  const slug = slugFromEmail(emailNorm);
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name: 'Personal',
      slug,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscriptionStatus,
    } as any)
    .select('id')
    .single();
  if (orgErr || !org) {
    console.error('Stripe webhook: org insert failed', orgErr?.message);
    return null;
  }
  const orgId = (org as { id: string }).id;
  await (admin.from('organization_members') as any)
    .upsert({ org_id: orgId, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' } as any);

  if (isNewUser) {
    try {
      const baseUrl = getBaseUrl();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: emailNorm,
        options: { redirectTo: `${baseUrl}/dashboard` },
      });
      const actionLink = linkData?.properties?.action_link;
      if (typeof actionLink === 'string' && actionLink) {
        await sendCheckoutConfirmationEmail(emailNorm, actionLink);
      }
    } catch (emailErr) {
      console.error('Stripe webhook: generate/send confirmation email:', emailErr);
    }
  }

  return { userId, orgId, isNewUser };
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
        let subscriptionId: string | null = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
        const email = (session.customer_details?.email ?? session.customer_email ?? '').toString().trim().toLowerCase();
        if (!email) {
          console.warn('Stripe webhook: checkout.session.completed — no email in session');
          return NextResponse.json({ error: 'No email in session' }, { status: 400 });
        }
        if (!customerId) {
          return NextResponse.json({ error: 'No customer in session' }, { status: 400 });
        }
        // Subscription required for platform access (trials still create a subscription; if missing, customer.subscription.created will create the account)
        if (!subscriptionId) {
          console.warn('Stripe webhook: checkout.session.completed — no subscription ID (trial checkout may use customer.subscription.created instead)', { email, customerId });
          return NextResponse.json({ received: true });
        }

        const stripe = new Stripe(stripeSecret);
        let subscriptionStatus = 'active';
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = sub.status;
        } catch {
          // keep default
        }

        const result = await ensureUserAndOrgFromStripe(admin, email, customerId, subscriptionId, subscriptionStatus, stripe);
        if (!result) {
          return NextResponse.json({ error: 'Failed to create user/org' }, { status: 500 });
        }
        const { orgId, isNewUser } = result;
        // Ensure org has latest subscription status
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await (admin.from('organizations') as any).update({ subscription_status: sub.status }).eq('id', orgId);
        } catch {
          // keep existing
        }

        console.log('Stripe webhook: account created from checkout.session.completed', { email, orgId, isNewUser });
        return NextResponse.json({ received: true });
      }

      case 'customer.subscription.created': {
        // Fallback for trial signups: checkout.session.completed sometimes has no subscription ID yet; this event always has the new subscription.
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
        if (!customerId) return NextResponse.json({ received: true });

        // One org per subscription: check by subscription_id
        const { data: existingOrg } = await (admin.from('organizations') as any)
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        if (existingOrg) {
          await (admin.from('organizations') as any)
            .update({ stripe_customer_id: customerId, subscription_status: subscription.status })
            .eq('id', (existingOrg as { id: string }).id);
          return NextResponse.json({ received: true });
        }

        const stripe = new Stripe(stripeSecret);
        let email: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            email = (customer.email ?? '').trim().toLowerCase() || null;
          }
        } catch (err) {
          console.error('Stripe webhook: customer.subscription.created — could not fetch customer', customerId, err);
          return NextResponse.json({ received: true });
        }
        if (!email) {
          console.warn('Stripe webhook: customer.subscription.created — no email on customer', customerId);
          return NextResponse.json({ received: true });
        }

        const result = await ensureUserAndOrgFromStripe(
          admin,
          email,
          customerId,
          subscription.id,
          subscription.status,
          stripe
        );
        if (result) {
          console.log('Stripe webhook: account created from customer.subscription.created (trial/fallback)', {
            email,
            orgId: result.orgId,
            isNewUser: result.isNewUser,
          });
        }
        return NextResponse.json({ received: true });
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;
        // One org per subscription: look up by subscription_id (same customer can have multiple orgs)
        const { error } = await (admin.from('organizations') as any)
          .update({ subscription_status: status })
          .eq('stripe_subscription_id', subscription.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ received: true });
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) return NextResponse.json({ received: true });
        const stripe = new Stripe(stripeSecret);
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        // One org per subscription
        await (admin.from('organizations') as any)
          .update({ subscription_status: sub.status })
          .eq('stripe_subscription_id', subscriptionId);
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
