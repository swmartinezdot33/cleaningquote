-- Stripe subscription fields on organizations (paid access)
-- When set, dashboard access is gated on subscription_status in ('active', 'trialing').

alter table public.organizations
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

create index if not exists organizations_stripe_customer_id_idx on public.organizations(stripe_customer_id) where stripe_customer_id is not null;

comment on column public.organizations.stripe_customer_id is 'Stripe customer id (cus_...). When set, org access requires active/trialing subscription.';
comment on column public.organizations.stripe_subscription_id is 'Stripe subscription id (sub_...).';
comment on column public.organizations.subscription_status is 'Stripe subscription status: active, trialing, past_due, canceled, unpaid, etc.';
