-- FARECOH Event Platform - Supabase/PostgreSQL schema
-- Production-grade MVP for multi-event reservations, sales, tickets and check-in.

create extension if not exists pgcrypto;

create type event_status as enum ('draft', 'active', 'sold_out', 'completed', 'cancelled');
create type order_status as enum ('pending', 'paid', 'cancelled', 'refunded');
create type ticket_status as enum ('pending', 'paid', 'validated', 'cancelled');
create type admin_role as enum ('super_admin', 'event_manager', 'checkin_operator');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  location text not null,
  city text not null default 'Tegucigalpa',
  event_date date not null,
  event_time time not null,
  ticket_price numeric(10, 2) not null check (ticket_price >= 0),
  capacity integer not null check (capacity > 0),
  status event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  created_at timestamptz not null default now(),
  constraint customers_name_not_blank check (length(trim(full_name)) >= 3),
  constraint customers_phone_not_blank check (length(trim(phone)) >= 8),
  constraint customers_email_format check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create unique index customers_email_unique_idx on public.customers (lower(email)) where email is not null;
create index customers_phone_idx on public.customers (phone);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  quantity integer not null check (quantity between 1 and 10),
  payment_reference text,
  payment_method text,
  status order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_event_id_idx on public.orders (event_id);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create sequence if not exists public.ticket_number_seq start 1;

create or replace function public.next_ticket_code()
returns text
language sql
as $$
  select 'PF-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
$$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  ticket_code text not null unique default public.next_ticket_code(),
  status ticket_status not null default 'pending',
  qr_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  ticket_url text,
  issued_at timestamptz not null default now(),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_code_format check (ticket_code ~ '^PF-[0-9]{6}$'),
  constraint ticket_validated_consistency check ((status = 'validated') = (validated_at is not null))
);

create index tickets_event_id_idx on public.tickets (event_id);
create index tickets_order_id_idx on public.tickets (order_id);
create index tickets_customer_id_idx on public.tickets (customer_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_qr_token_idx on public.tickets (qr_token);

create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role admin_role not null default 'checkin_operator',
  created_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete restrict,
  checked_by uuid references public.admins(id) on delete set null,
  checked_at timestamptz not null default now(),
  device_info text
);

create index checkins_checked_by_idx on public.checkins (checked_by);
create index checkins_checked_at_idx on public.checkins (checked_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.admins(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger tickets_set_updated_at before update on public.tickets for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

create or replace function public.create_ticket_order(
  p_event_slug text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_quantity integer
)
returns table (
  order_id uuid,
  customer_id uuid,
  ticket_codes text[],
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_ticket_id uuid;
  v_codes text[] := '{}';
  v_code text;
  v_existing_count integer;
begin
  if p_quantity < 1 or p_quantity > 10 then
    raise exception 'Ticket quantity must be between 1 and 10';
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'active'
  for update;

  if not found then
    raise exception 'Event not found or inactive';
  end if;

  select count(*) into v_existing_count
  from public.tickets
  where event_id = v_event.id and status <> 'cancelled';

  if v_existing_count + p_quantity > v_event.capacity then
    raise exception 'Event capacity exceeded';
  end if;

  select id into v_customer_id
  from public.customers
  where nullif(lower(trim(p_email)), '') is not null
    and lower(email) = lower(trim(p_email))
  limit 1;

  if v_customer_id is null then
    insert into public.customers (full_name, email, phone)
    values (trim(p_full_name), nullif(lower(trim(p_email)), ''), trim(p_phone))
    returning id into v_customer_id;
  end if;

  insert into public.orders (event_id, customer_id, total_amount, quantity, status)
  values (v_event.id, v_customer_id, v_event.ticket_price * p_quantity, p_quantity, 'pending')
  returning id into v_order_id;

  for i in 1..p_quantity loop
    insert into public.tickets (event_id, order_id, customer_id, status, ticket_url)
    values (v_event.id, v_order_id, v_customer_id, 'pending', '/eventos/' || v_event.slug || '/boletos')
    returning id, ticket_code into v_ticket_id, v_code;
    v_codes := array_append(v_codes, v_code);
  end loop;

  insert into public.audit_logs (action, entity, entity_id, new_value)
  values ('sale.reserved', 'orders', v_order_id, jsonb_build_object('event_slug', p_event_slug, 'quantity', p_quantity, 'ticket_codes', v_codes));

  return query select v_order_id, v_customer_id, v_codes, v_event.ticket_price * p_quantity;
end;
$$;

create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_payment_reference text,
  p_payment_method text,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select to_jsonb(o) into v_old from public.orders o where o.id = p_order_id for update;

  update public.orders
  set status = 'paid', payment_reference = p_payment_reference, payment_method = p_payment_method
  where id = p_order_id
  returning to_jsonb(orders.*) into v_new;

  update public.tickets set status = 'paid' where order_id = p_order_id and status = 'pending';

  insert into public.audit_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (p_user_id, 'sale.paid', 'orders', p_order_id, v_old, v_new);
end;
$$;

create or replace function public.validate_ticket(
  p_ticket_code text,
  p_checked_by uuid default auth.uid(),
  p_device_info text default null
)
returns table (
  ok boolean,
  message text,
  ticket_id uuid,
  ticket_code text,
  status public.ticket_status,
  validated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_ticket
  from public.tickets
  where ticket_code = upper(trim(p_ticket_code))
  for update;

  if not found then
    return query select false, 'Boleto no encontrado', null::uuid, upper(trim(p_ticket_code)), null::public.ticket_status, null::timestamptz;
    return;
  end if;

  if v_ticket.status = 'cancelled' then
    return query select false, 'Boleto cancelado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    return;
  end if;

  if v_ticket.status = 'pending' then
    return query select false, 'Boleto pendiente de pago', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    return;
  end if;

  if v_ticket.status = 'validated' then
    return query select false, 'Boleto ya validado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    return;
  end if;

  update public.tickets
  set status = 'validated', validated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  insert into public.checkins (ticket_id, checked_by, checked_at, device_info)
  values (v_ticket.id, p_checked_by, v_ticket.validated_at, p_device_info);

  insert into public.audit_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    p_checked_by,
    'ticket.validated',
    'tickets',
    v_ticket.id,
    jsonb_build_object('status', 'paid'),
    jsonb_build_object('status', v_ticket.status, 'validated_at', v_ticket.validated_at)
  );

  return query select true, 'Ingreso validado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
end;
$$;

alter table public.events enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.admins enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;

create policy "Public can read active events" on public.events for select using (status = 'active');
create policy "Admins can manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can read customers" on public.customers for select using (public.is_admin());
create policy "Admins can manage customers" on public.customers for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage tickets" on public.tickets for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can read admins" on public.admins for select using (public.is_admin());
create policy "Admins can manage checkins" on public.checkins for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can read audit logs" on public.audit_logs for select using (public.is_admin());