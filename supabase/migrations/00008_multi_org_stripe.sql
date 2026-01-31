-- Multiple orgs per user, one subscription per org ($297/org).
-- Same Stripe customer can have multiple subscriptions (one per org).
-- Key org by stripe_subscription_id for webhook updates.

-- Allow multiple orgs per Stripe customer (drop unique on stripe_customer_id)
alter table public.organizations drop constraint if exists organizations_stripe_customer_id_key;

-- One org per subscription: unique on stripe_subscription_id (where set)
create unique index if not exists organizations_stripe_subscription_id_key
  on public.organizations(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists organizations_stripe_subscription_id_idx
  on public.organizations(stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.organizations.stripe_customer_id is 'Stripe customer id (cus_...). Same customer can have multiple orgs (multiple subscriptions).';
comment on column public.organizations.stripe_subscription_id is 'Stripe subscription id (sub_...). One org per subscription; used to look up org in webhooks.';
