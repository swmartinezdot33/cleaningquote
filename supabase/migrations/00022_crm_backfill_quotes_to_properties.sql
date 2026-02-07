-- Backfill: create contacts and properties from existing quotes, set property_id on quotes
-- Only processes quotes with tool_id (org comes from tool). Quotes with null tool_id keep property_id null.

do $$
declare
  q record;
  c_id uuid;
  p_id uuid;
  norm_addr text;
  e text;
begin
  for q in
    select qu.id as quote_uuid, qu.tool_id, qu.first_name, qu.last_name, qu.email, qu.phone,
           qu.address, qu.city, qu.state, qu.postal_code, qu.country,
           t.org_id
    from public.quotes qu
    join public.tools t on t.id = qu.tool_id
    where qu.tool_id is not null
      and qu.property_id is null
  loop
    e := nullif(trim(q.email), '');

    -- Upsert contact: when email present, use ON CONFLICT; when null, plain insert
    if e is not null then
      insert into public.contacts (org_id, first_name, last_name, email, phone, source, stage)
      values (q.org_id, q.first_name, q.last_name, e, nullif(trim(q.phone), ''), 'Website Quote Form', 'quoted')
      on conflict (org_id, email) do update set
        first_name = coalesce(excluded.first_name, contacts.first_name),
        last_name = coalesce(excluded.last_name, contacts.last_name),
        phone = coalesce(excluded.phone, contacts.phone),
        updated_at = now()
      returning id into c_id;
    else
      insert into public.contacts (org_id, first_name, last_name, email, phone, source, stage)
      values (q.org_id, q.first_name, q.last_name, null, nullif(trim(q.phone), ''), 'Website Quote Form', 'quoted')
      returning id into c_id;
    end if;

    -- Find or create property for this contact + address
    norm_addr := lower(trim(coalesce(q.address,'') || ' ' || coalesce(q.city,'') || ' ' || coalesce(q.state,'') || ' ' || coalesce(q.postal_code,'')));
    select id into p_id from public.properties
    where contact_id = c_id and org_id = q.org_id
      and lower(trim(coalesce(address,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'') || ' ' || coalesce(postal_code,''))) = norm_addr
    limit 1;

    if p_id is null then
      insert into public.properties (contact_id, org_id, address, city, state, postal_code, country, stage)
      values (c_id, q.org_id, q.address, q.city, q.state, q.postal_code, q.country, 'quoted')
      returning id into p_id;
    end if;

    update public.quotes set property_id = p_id where id = q.quote_uuid;
  end loop;
end $$;
