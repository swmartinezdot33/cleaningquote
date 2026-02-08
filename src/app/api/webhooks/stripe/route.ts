import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/canonical-url';
import { createGHLSubAccount } from '@/lib/ghl/agency';

export const dynamic = 'force-dynamic';

// Read at request time so serverless runtime always sees current env (Vercel etc.)
function getStripeConfig() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const webhookSecretAlt = process.env.STRIPE_WEBHOOK_SECRET_ALT?.trim();
  return {
    stripeSecret: stripeSecret || undefined,
    webhookSecret: webhookSecret || undefined,
    webhookSecretAlt: webhookSecretAlt || undefined,
  };
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM ?? 'CleanQuote.io <team@clean.io>';

function getBaseUrl(): string {
  return getSiteUrl();
}

function slugFromEmail(email: string): string {
  const part = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'org';
  return part + '-' + Date.now().toString(36).slice(-6);
}

/** Send confirmation email with set-password link after checkout (optional; requires RESEND_API_KEY). */
async function sendCheckoutConfirmationEmail(email: string, setPasswordLink: string): Promise<void> {
  if (!resendApiKey?.trim()) {
    console.warn('Stripe webhook: RESEND_API_KEY not set — skipping checkout confirmation email. Set it in Vercel to send emails.');
    return;
  }
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const dashboardUrl = `${baseUrl}/dashboard`;
  try {
    const resend = new Resend(resendApiKey.trim());
    const { data, error } = await resend.emails.send({
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
    if (error) {
      console.error('Stripe webhook: Resend API error (check domain verification, from address):', { email, error, from: resendFrom });
    } else {
      console.log('Stripe webhook: checkout confirmation email sent', { email, id: data?.id });
    }
  } catch (err) {
    console.error('Stripe webhook: failed to send checkout confirmation email:', err);
  }
}

/** Get business name from Stripe customer (set in create-customer: metadata.businessName or description). */
function getBusinessNameFromCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): string | null {
  if (customer.deleted) return null;
  const meta = (customer as Stripe.Customer).metadata;
  if (meta?.businessName && String(meta.businessName).trim()) return String(meta.businessName).trim();
  if ((customer as Stripe.Customer).description && String((customer as Stripe.Customer).description).trim()) {
    return String((customer as Stripe.Customer).description).trim();
  }
  return null;
}

/** Get full name from Stripe customer (display name for the admin user). */
function getFullNameFromCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): string | null {
  if (customer.deleted) return null;
  const c = customer as Stripe.Customer;
  if (c.name && String(c.name).trim()) return String(c.name).trim();
  const meta = c.metadata;
  if (meta?.fullName && String(meta.fullName).trim()) return String(meta.fullName).trim();
  const first = meta?.firstName ? String(meta.firstName).trim() : '';
  const last = meta?.lastName ? String(meta.lastName).trim() : '';
  if (first || last) return `${first} ${last}`.trim();
  return null;
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
  stripe: Stripe,
  orgName?: string | null,
  fullName?: string | null
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
    let found = await findUserIdByEmail(admin, emailNorm);
    if (!found) {
      await new Promise((r) => setTimeout(r, 1500));
      found = await findUserIdByEmail(admin, emailNorm);
    }
    if (found) {
      const { error: memberErr } = await (admin.from('organization_members') as any)
        .upsert({ org_id: orgId, user_id: found, role: 'admin' }, { onConflict: 'org_id,user_id' } as any);
      if (memberErr) {
        console.error('Stripe webhook: existing org — membership upsert failed', { orgId, userId: found, error: memberErr.message });
      }
    } else {
      console.warn('Stripe webhook: existing org but user not found by email', { emailNorm, orgId });
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
  let emailSentViaSupabase = false;
  const userDisplayName = (fullName && fullName.trim()) || '';
  const baseUrl = getBaseUrl();
  const redirectTo = `${baseUrl}/auth/set-password`;

  // Prefer inviteUserByEmail — Supabase sends the invite via its SMTP (Resend), no manual Resend call needed
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    redirectTo,
    data: userDisplayName ? { full_name: userDisplayName } : undefined,
  });

  if (!inviteError && inviteData?.user) {
    userId = inviteData.user.id;
    isNewUser = true;
    emailSentViaSupabase = true;
    console.log('Stripe webhook: inviteUserByEmail sent (Supabase SMTP) — user will receive invite', { email: emailNorm });
  } else if (inviteError?.message?.includes('already') || inviteError?.message?.includes('registered') || inviteError?.message?.includes('exists')) {
    // User already exists — get their id and use generateLink + Resend for set-password email
    const found = await findUserIdByEmail(admin, emailNorm);
    if (!found) {
      console.error('Stripe webhook: invite failed (user exists) but findUserIdByEmail returned null', emailNorm);
      return null;
    }
    userId = found;
  } else {
    // Fallback: createUser + generateLink + Resend
    const { data: existingUser, error: createError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: crypto.randomUUID().replace(/-/g, '') + 'A1!',
      email_confirm: true,
      user_metadata: userDisplayName ? { full_name: userDisplayName } : undefined,
    });
    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        const found = await findUserIdByEmail(admin, emailNorm);
        if (!found) {
          console.error('Stripe webhook: user exists in Supabase but findUserIdByEmail returned null', emailNorm);
          return null;
        }
        userId = found;
      } else {
        console.error('Stripe webhook: createUser failed', {
          email: emailNorm,
          message: createError.message,
          code: (createError as any)?.code,
          status: (createError as any)?.status,
        });
        return null;
      }
    } else {
      userId = existingUser!.user!.id;
      isNewUser = true;
    }
  }

  // Race: another request may have created the org for this subscription; re-check and just add membership
  const { data: raceOrg } = await (admin.from('organizations') as any)
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (raceOrg) {
    const orgId = (raceOrg as { id: string }).id;
    const { error: memberErr } = await (admin.from('organization_members') as any)
      .upsert({ org_id: orgId, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' } as any);
    if (memberErr) {
      console.error('Stripe webhook: race org — membership upsert failed', { orgId, userId, error: memberErr.message });
      return null;
    }
    console.log('Stripe webhook: org already existed (race), added membership', { email: emailNorm, orgId });
    return { userId, orgId, isNewUser: false };
  }

  console.log('Stripe webhook: ensureUserAndOrgFromStripe — creating org', { email: emailNorm, subscriptionId, orgName: (orgName && orgName.trim()) || 'Personal' });

  // New subscription = new org ($297/org). Same user (email) can have multiple orgs. Use business name when available.
  const baseSlug = slugFromEmail(emailNorm);
  const displayName = (orgName && orgName.trim()) || 'Personal';
  let orgId: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slugToUse = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: displayName,
        slug: slugToUse,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: subscriptionStatus,
      } as any)
      .select('id')
      .single();
    if (!orgErr && org) {
      orgId = (org as { id: string }).id;
      break;
    }
    if (orgErr?.code === '23505' && attempt < 2) {
      console.warn('Stripe webhook: org slug conflict, retrying', { slug: slugToUse });
      continue;
    }
    console.error('Stripe webhook: org insert failed', { message: orgErr?.message, code: (orgErr as any)?.code, slug: slugToUse });
    return null;
  }
  if (!orgId) return null;

  const { error: memberErr } = await (admin.from('organization_members') as any)
    .upsert({ org_id: orgId, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' } as any);
  if (memberErr) {
    console.error('Stripe webhook: organization_members upsert failed', { orgId, userId, error: memberErr.message });
    return null;
  }

  if (isNewUser && !emailSentViaSupabase) {
    // Fallback: createUser path — send set-password email via Resend (inviteUserByEmail already sent for invite path)
    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: emailNorm,
        options: { redirectTo: `${baseUrl}/dashboard` },
      });
      if (linkError) {
        console.error('Stripe webhook: generateLink failed — user will not receive confirmation email:', { email: emailNorm, error: linkError.message });
      } else {
        const actionLink = linkData?.properties?.action_link;
        if (typeof actionLink === 'string' && actionLink) {
          await sendCheckoutConfirmationEmail(emailNorm, actionLink);
        } else {
          console.error('Stripe webhook: generateLink returned no action_link — user will not receive confirmation email', { email: emailNorm });
        }
      }
    } catch (emailErr) {
      console.error('Stripe webhook: generate/send confirmation email:', emailErr);
    }
  }

  return { userId, orgId, isNewUser };
}

export async function POST(request: NextRequest) {
  const { stripeSecret, webhookSecret, webhookSecretAlt } = getStripeConfig();
  const hasPrimary = !!webhookSecret;
  const hasAlt = !!webhookSecretAlt;
  if (!stripeSecret || (!hasPrimary && !hasAlt)) {
    console.error('Stripe webhook: STRIPE_SECRET_KEY and at least one of STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_ALT must be set (check Production env in Vercel)');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  // Must use raw body for signature verification (do not parse JSON first)
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (e) {
    console.error('Stripe webhook: failed to read body', e);
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  const secretsToTry = [webhookSecret, webhookSecretAlt].filter(Boolean) as string[];
  let event: Stripe.Event | null = null;
  for (const secret of secretsToTry) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch {
      continue;
    }
  }
  if (!event) {
    console.error('Stripe webhook: signature verification failed (tried all configured secrets)');
    return NextResponse.json(
      { error: 'No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe?' },
      { status: 400 }
    );
  }

  console.log('Stripe webhook: received event', event.type, event.id);

  // We only create Supabase user + org when payment is completed and we have a subscription ID.
  // Ignore: payment_method.*, customer.created, etc. — never create account before subscription exists.
  let admin: ReturnType<typeof createSupabaseServer>;
  try {
    admin = createSupabaseServer();
  } catch (e) {
    console.error('Stripe webhook: Supabase not configured', e);
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Create Supabase user + org when checkout is completed (we have session email, customer, and subscription).
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        let subscriptionId: string | null = typeof session.subscription === 'string' ? session.subscription : (session.subscription as Stripe.Subscription)?.id ?? null;
        let email = (session.customer_details?.email ?? session.customer_email ?? '').toString().trim().toLowerCase();

        console.log('Stripe webhook: checkout.session.completed payload', {
          mode: session.mode,
          hasCustomerId: !!customerId,
          hasEmail: !!email,
          hasSubscriptionId: !!subscriptionId,
        });

        // Fallback: if no email in session (e.g. some payment link flows), fetch from customer
        if (!email && customerId) {
          try {
            const stripeApi = new Stripe(stripeSecret);
            const customer = await stripeApi.customers.retrieve(customerId);
            if (customer && !customer.deleted) {
              email = ((customer as Stripe.Customer).email ?? '').trim().toLowerCase();
              if (email) console.log('Stripe webhook: got email from customer', { customerId });
            }
          } catch (err) {
            console.error('Stripe webhook: could not fetch customer for email fallback', customerId, err);
          }
        }

        if (!email) {
          console.warn('Stripe webhook: checkout.session.completed — no email in session or customer');
          return NextResponse.json({ error: 'No email in session' }, { status: 400 });
        }
        if (!customerId) {
          console.warn('Stripe webhook: checkout.session.completed — no customer in session');
          return NextResponse.json({ error: 'No customer in session' }, { status: 400 });
        }

        // If session has no subscription ID yet (e.g. trial), fetch customer's subscriptions — retry with delay
        if (!subscriptionId) {
          const stripeApi = new Stripe(stripeSecret);
          const delays = [0, 2000, 4000];
          for (const delayMs of delays) {
            if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
            const subs = await stripeApi.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
            if (subs.data.length > 0) {
              subscriptionId = subs.data[0].id;
              console.log('Stripe webhook: resolved subscription from customer list', { subscriptionId, afterDelayMs: delayMs });
              break;
            }
          }
        }

        if (!subscriptionId) {
          console.log('Stripe webhook: checkout.session.completed — no subscription ID (session.mode may not be subscription?). Rely on customer.subscription.created.', { email, customerId, mode: session.mode });
          return NextResponse.json({ received: true });
        }

        const stripeApi = new Stripe(stripeSecret);
        let subscriptionStatus = 'active';
        try {
          const sub = await stripeApi.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = sub.status;
        } catch {
          // keep default
        }

        let orgName: string | null = null;
        let fullName: string | null = null;
        try {
          const customer = await stripeApi.customers.retrieve(customerId);
          orgName = getBusinessNameFromCustomer(customer);
          fullName = getFullNameFromCustomer(customer);
        } catch {
          // keep null, will use 'Personal' / no display name
        }

        // Create GHL sub-account when agency credentials are configured (Stripe purchase → GHL)
        const ghlResult = await createGHLSubAccount({
          name: orgName || fullName || email.split('@')[0],
          email,
          phone: undefined,
          firstName: fullName?.split(/\s+/)[0],
          lastName: fullName?.split(/\s+/).slice(1).join(' '),
          stripeCustomerId: customerId,
        });
        if (ghlResult.success && ghlResult.locationId) {
          console.log('Stripe webhook: GHL sub-account created', { email, locationId: ghlResult.locationId });
          try {
            const { getKV } = await import('@/lib/kv');
            const kv = getKV();
            await kv.set(`stripe:sub:${subscriptionId}:ghl_location`, ghlResult.locationId, { ex: 60 * 60 * 24 * 365 }); // 1 year
          } catch (kvErr) {
            console.warn('Stripe webhook: could not store GHL location mapping in KV', kvErr);
          }
        } else if (process.env.GHL_AGENCY_ACCESS_TOKEN) {
          console.warn('Stripe webhook: GHL sub-account creation failed', { email, error: ghlResult.error });
        }

        console.log('Stripe webhook: creating user and org', { email, customerId, subscriptionId, subscriptionStatus });
        const result = await ensureUserAndOrgFromStripe(admin, email, customerId, subscriptionId, subscriptionStatus, stripeApi, orgName, fullName);
        if (!result) {
          console.error('Stripe webhook: ensureUserAndOrgFromStripe returned null — check Supabase (SUPABASE_SERVICE_ROLE_KEY, auth users, organizations table)', { email, customerId, subscriptionId });
          return NextResponse.json({ error: 'Failed to create user/org' }, { status: 500 });
        }
        const { orgId, isNewUser } = result;
        try {
          const sub = await stripeApi.subscriptions.retrieve(subscriptionId);
          await (admin.from('organizations') as any).update({ subscription_status: sub.status }).eq('id', orgId);
        } catch {
          // keep existing
        }

        console.log('Stripe webhook: account created from checkout.session.completed', { email, orgId, isNewUser });
        return NextResponse.json({ received: true });
      }

      case 'customer.subscription.created': {
        // Fallback: create user + org if checkout.session.completed didn't have subscription ID yet (e.g. trial timing).
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
        console.log('Stripe webhook: customer.subscription.created', { subscriptionId: subscription.id, customerId, status: subscription.status });
        if (!customerId) {
          console.warn('Stripe webhook: customer.subscription.created — no customer on subscription');
          return NextResponse.json({ received: true });
        }

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
        let orgName: string | null = null;
        let fullName: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            email = (customer.email ?? '').trim().toLowerCase() || null;
            orgName = getBusinessNameFromCustomer(customer);
            fullName = getFullNameFromCustomer(customer);
          }
        } catch (err) {
          console.error('Stripe webhook: customer.subscription.created — could not fetch customer', customerId, err);
          return NextResponse.json({ received: true });
        }
        if (!email) {
          console.warn('Stripe webhook: customer.subscription.created — no email on customer', customerId);
          return NextResponse.json({ received: true });
        }

        const emailNormSub = email.trim().toLowerCase();
        const ghlResultSub = await createGHLSubAccount({
          name: orgName || fullName || emailNormSub.split('@')[0],
          email: emailNormSub,
          phone: undefined,
          firstName: fullName?.split(/\s+/)[0],
          lastName: fullName?.split(/\s+/).slice(1).join(' '),
          stripeCustomerId: customerId,
        });
        if (ghlResultSub.success && ghlResultSub.locationId) {
          console.log('Stripe webhook: GHL sub-account created (subscription fallback)', { email: emailNormSub, locationId: ghlResultSub.locationId });
          try {
            const { getKV } = await import('@/lib/kv');
            const kv = getKV();
            await kv.set(`stripe:sub:${subscription.id}:ghl_location`, ghlResultSub.locationId, { ex: 60 * 60 * 24 * 365 });
          } catch (kvErr) {
            console.warn('Stripe webhook: could not store GHL location mapping in KV', kvErr);
          }
        } else if (process.env.GHL_AGENCY_ACCESS_TOKEN) {
          console.warn('Stripe webhook: GHL sub-account creation failed (subscription)', { email: emailNormSub, error: ghlResultSub.error });
        }

        const result = await ensureUserAndOrgFromStripe(
          admin,
          email,
          customerId,
          subscription.id,
          subscription.status,
          stripe,
          orgName,
          fullName
        );
        if (result) {
          console.log('Stripe webhook: account created from customer.subscription.created (trial/fallback)', {
            email,
            orgId: result.orgId,
            isNewUser: result.isNewUser,
          });
          return NextResponse.json({ received: true });
        }
        // Failed to create user/org — return 500 so Stripe retries the webhook
        console.error('Stripe webhook: customer.subscription.created — ensureUserAndOrgFromStripe returned null (account not created)', {
          email,
          customerId,
          subscriptionId: subscription.id,
        });
        return NextResponse.json(
          { error: 'Failed to create user/org from subscription' },
          { status: 500 }
        );
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
        // Ignore payment_method.*, customer.created, etc. We never create Supabase account until we have a subscription.
        if (event.type.startsWith('payment_method.')) {
          console.log('Stripe webhook: ignoring (no account creation)', event.type);
        }
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
