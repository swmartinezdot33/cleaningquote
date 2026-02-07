-- Mock data for local development
-- Run via: npx supabase db reset (seed runs after migrations)
-- Login: steven@earnyour.com / Password123!

do $$
declare
  demo_user_id uuid;
  demo_org_id uuid;
  demo_tool_id uuid;
  c1_id uuid;
  c2_id uuid;
  c3_id uuid;
  p1_id uuid;
  p2_id uuid;
begin
  -- 1. Create auth user (skip if exists)
  select id into demo_user_id from auth.users where email = 'steven@earnyour.com' limit 1;
  if demo_user_id is null then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'steven@earnyour.com',
      extensions.crypt('Password123!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '', '', '', '', ''
    )
    returning id into demo_user_id;
  end if;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), demo_user_id, 'steven@earnyour.com',
    jsonb_build_object('sub', demo_user_id::text, 'email', 'steven@earnyour.com'),
    'email', now(), now(), now()
  where not exists (select 1 from auth.identities where user_id = demo_user_id and provider = 'email');

  -- 2. Create org (skip if exists)
  select id into demo_org_id from public.organizations where slug = 'raleigh-cleaning-company' limit 1;
  if demo_org_id is null then
    insert into public.organizations (id, name, slug)
    values (gen_random_uuid(), 'Raleigh Cleaning Company', 'raleigh-cleaning-company')
    returning id into demo_org_id;
  end if;

  -- 3. Add user as org admin
  insert into public.organization_members (org_id, user_id, role)
  values (demo_org_id, demo_user_id, 'admin')
  on conflict (org_id, user_id) do nothing;

  -- 4. Create tool (skip if exists)
  select id into demo_tool_id from public.tools where org_id = demo_org_id and slug = 'residential-quotes' limit 1;
  if demo_tool_id is null then
    insert into public.tools (id, org_id, user_id, name, slug)
    values (gen_random_uuid(), demo_org_id, demo_user_id, 'Residential Quotes', 'residential-quotes')
    returning id into demo_tool_id;
  end if;

  -- 5. Create contacts (only if none exist for this org)
  if not exists (select 1 from public.contacts where org_id = demo_org_id limit 1) then
    insert into public.contacts (org_id, first_name, last_name, email, phone, stage, source)
    values (demo_org_id, 'Sarah', 'Johnson', 'sarah.johnson@example.com', '919-555-0101', 'quoted', 'Website Quote Form')
    returning id into c1_id;

    insert into public.contacts (org_id, first_name, last_name, email, phone, stage, source)
    values (demo_org_id, 'Mike', 'Chen', 'mike.chen@example.com', '919-555-0102', 'booked', 'Website Quote Form')
    returning id into c2_id;

    insert into public.contacts (org_id, first_name, last_name, email, phone, stage, source)
    values (demo_org_id, 'Emily', 'Davis', 'emily.davis@example.com', '919-555-0103', 'lead', 'Manual Entry')
    returning id into c3_id;

    insert into public.contacts (org_id, first_name, last_name, email, phone, stage, source)
    values (demo_org_id, 'James', 'Wilson', 'james.wilson@example.com', '919-555-0104', 'customer', 'Website Quote Form');

    -- 6. Create properties for contacts
    insert into public.properties (contact_id, org_id, address, city, state, postal_code, country, stage)
    values (c1_id, demo_org_id, '123 Oak Street', 'Raleigh', 'NC', '27601', 'US', 'quoted')
    returning id into p1_id;

    insert into public.properties (contact_id, org_id, address, city, state, postal_code, country, stage)
    values (c2_id, demo_org_id, '456 Pine Avenue', 'Raleigh', 'NC', '27603', 'US', 'booked')
    returning id into p2_id;

    insert into public.properties (contact_id, org_id, address, city, state, postal_code, country, stage)
    values (c3_id, demo_org_id, '789 Maple Drive', 'Cary', 'NC', '27511', 'US', 'lead');

    -- 7. Create quotes
    insert into public.quotes (quote_id, tool_id, property_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, payload, status)
    values
      ('quote-' || substr(gen_random_uuid()::text, 1, 8), demo_tool_id, p1_id, 'Sarah', 'Johnson', 'sarah.johnson@example.com', '919-555-0101', '123 Oak Street', 'Raleigh', 'NC', '27601', 'general', 'bi-weekly', 120, 150, '2000', 4, '{}', 'quote'),
      ('quote-' || substr(gen_random_uuid()::text, 1, 8), demo_tool_id, p2_id, 'Mike', 'Chen', 'mike.chen@example.com', '919-555-0102', '456 Pine Avenue', 'Raleigh', 'NC', '27603', 'deep', 'one-time', 250, 300, '1800', 3, '{}', 'quote'),
      ('quote-' || substr(gen_random_uuid()::text, 1, 8), demo_tool_id, null, 'Emily', 'Davis', 'emily.davis@example.com', '919-555-0103', '789 Maple Drive', 'Cary', 'NC', '27511', 'general', 'weekly', 90, 120, '1500', 3, '{}', 'quote'),
      ('quote-' || substr(gen_random_uuid()::text, 1, 8), demo_tool_id, null, 'John', 'Smith', 'john.smith@example.com', '919-555-0105', '321 Elm Blvd', 'Durham', 'NC', '27701', 'move-in', 'one-time', 350, 450, '2200', 4, '{}', 'quote'),
      ('quote-' || substr(gen_random_uuid()::text, 1, 8), demo_tool_id, null, 'Lisa', 'Brown', 'lisa.brown@example.com', '919-555-0106', '555 Cedar Lane', 'Raleigh', 'NC', '27606', 'general', 'four-week', 140, 180, '2500', 5, '{}', 'quote');
  end if;

  raise notice 'Seed complete. Login: steven@earnyour.com / Password123!';
end $$;
