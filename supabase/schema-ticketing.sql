create extension if not exists pgcrypto;

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  type text not null,
  active boolean not null default true,
  created_at timestamp default now(),
  constraint sellers_type_check check (type in ('vendor', 'physical_point')),
  constraint sellers_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create index if not exists sellers_active_idx on public.sellers(active);
create index if not exists sellers_type_idx on public.sellers(type);

create table if not exists public.ticket_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_code text not null,
  end_code text not null,
  total_tickets integer not null,
  assigned_seller_id uuid null references public.sellers(id),
  location text null,
  status text default 'active',
  created_at timestamp default now(),
  constraint ticket_batches_status_check check (status in ('active', 'closed', 'cancelled')),
  constraint ticket_batches_codes_check check (start_code ~ '^PF-[0-9]{6}$' and end_code ~ '^PF-[0-9]{6}$'),
  constraint ticket_batches_total_check check (total_tickets > 0)
);

alter table public.ticket_batches drop column if exists assigned_to;
alter table public.ticket_batches add column if not exists assigned_seller_id uuid null references public.sellers(id);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.ticket_batches(id),
  event_slug text not null default 'pink-floyd',
  code text unique not null,
  qr_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  qr_url text unique null,
  status text default 'available',
  buyer_name text null,
  buyer_phone text null,
  buyer_email text null,
  seller_id uuid null references public.sellers(id),
  seller_name text null,
  sale_location text null,
  payment_method text null,
  payment_reference text null,
  sold_at timestamp null,
  validated_at timestamp null,
  notes text null,
  created_at timestamp default now(),
  constraint tickets_status_check check (status in ('available', 'assigned', 'reserved', 'paid', 'validated', 'cancelled')),
  constraint tickets_code_check check (code ~ '^PF-[0-9]{6}$'),
  constraint tickets_buyer_email_check check (buyer_email is null or buyer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint tickets_paid_has_sale_data check (status not in ('paid', 'validated') or (buyer_name is not null and buyer_phone is not null and sold_at is not null and seller_id is not null)),
  constraint tickets_validated_has_time check ((status = 'validated') = (validated_at is not null))
);

alter table public.tickets add column if not exists seller_id uuid null references public.sellers(id);

alter table public.tickets add column if not exists qr_token text;
alter table public.tickets add column if not exists qr_url text;
update public.tickets set qr_token = encode(digest('farecoh:pink-floyd:' || code, 'sha256'), 'hex') where qr_token is null;
update public.tickets set qr_url = current_setting('app.public_site_url', true) || '/t/' || qr_token where qr_url is null and current_setting('app.public_site_url', true) <> '';
create unique index if not exists tickets_qr_token_unique_idx on public.tickets(qr_token);
create unique index if not exists tickets_qr_url_unique_idx on public.tickets(qr_url) where qr_url is not null;

create index if not exists ticket_batches_status_idx on public.ticket_batches(status);
create index if not exists tickets_batch_id_idx on public.tickets(batch_id);
create index if not exists tickets_event_slug_idx on public.tickets(event_slug);
create index if not exists tickets_status_idx on public.tickets(status);
create index if not exists tickets_qr_token_idx on public.tickets(qr_token);
create index if not exists tickets_seller_id_idx on public.tickets(seller_id);
create index if not exists tickets_seller_name_idx on public.tickets(seller_name);
create index if not exists tickets_sale_location_idx on public.tickets(sale_location);
create index if not exists tickets_sold_at_idx on public.tickets(sold_at desc);

alter table public.sellers enable row level security;

create policy "Admins can manage sellers" on public.sellers
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.ticket_batches enable row level security;
alter table public.tickets enable row level security;

create policy "Admins can manage ticket batches" on public.ticket_batches
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage physical tickets" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.assign_ticket_range(
  p_start_code text,
  p_end_code text,
  p_seller_id uuid,
  p_location text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start integer;
  v_end integer;
  v_count integer;
  v_seller public.sellers%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_seller from public.sellers where id = p_seller_id and active = true;
  if not found then
    raise exception 'Vendedor no registrado o inactivo';
  end if;

  v_start := substring(upper(trim(p_start_code)) from 4)::integer;
  v_end := substring(upper(trim(p_end_code)) from 4)::integer;

  if v_start > v_end then
    raise exception 'Invalid range';
  end if;

  update public.tickets
  set status = case when status = 'available' then 'assigned' else status end,
      seller_id = v_seller.id,
      seller_name = v_seller.name,
      sale_location = trim(p_location)
  where substring(code from 4)::integer between v_start and v_end
    and status in ('available', 'assigned');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.sell_physical_ticket(
  p_code text,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_email text,
  p_seller_id uuid,
  p_sale_location text,
  p_payment_method text,
  p_payment_reference text default null,
  p_notes text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_seller public.sellers%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_seller from public.sellers where id = p_seller_id and active = true;
  if not found then
    raise exception 'Vendedor no registrado o inactivo';
  end if;

  select * into v_ticket from public.tickets where code = upper(trim(p_code)) for update;

  if not found then
    raise exception 'Boleto inexistente';
  end if;

  if v_ticket.status in ('cancelled', 'validated') then
    raise exception 'Este boleto no puede venderse';
  end if;

  if v_ticket.status = 'paid' then
    raise exception 'Este boleto ya esta vendido/pagado';
  end if;

  update public.tickets
  set status = 'paid',
      buyer_name = trim(p_buyer_name),
      buyer_phone = trim(p_buyer_phone),
      buyer_email = nullif(lower(trim(p_buyer_email)), ''),
      seller_id = v_seller.id,
      seller_name = v_seller.name,
      sale_location = trim(p_sale_location),
      payment_method = trim(p_payment_method),
      payment_reference = nullif(trim(p_payment_reference), ''),
      notes = nullif(trim(p_notes), ''),
      sold_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return v_ticket;
end;
$$;

create or replace function public.validate_physical_ticket(p_code text)
returns public.tickets
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

  select * into v_ticket from public.tickets where code = upper(trim(p_code)) for update;

  if not found then
    raise exception 'Boleto inexistente';
  end if;

  if v_ticket.status = 'validated' then
    raise exception 'Boleto ya utilizado';
  end if;

  if v_ticket.status = 'cancelled' then
    raise exception 'Boleto anulado';
  end if;

  if v_ticket.status <> 'paid' then
    raise exception 'Boleto no pagado';
  end if;

  update public.tickets
  set status = 'validated', validated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return v_ticket;
end;
$$;
create or replace function public.get_public_ticket_status(p_qr_token text)
returns table (
  code text,
  status text,
  event_slug text
)
language sql
security definer
set search_path = public
as $$
  select t.code, t.status, t.event_slug
  from public.tickets t
  where t.qr_token = p_qr_token
  limit 1;
$$;