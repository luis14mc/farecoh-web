with batch as (
  insert into public.ticket_batches (name, start_code, end_code, total_tickets, status)
  values ('LOTE GENERAL 001', 'PF-000001', 'PF-000500', 500, 'active')
  on conflict do nothing
  returning id
), selected_batch as (
  select id from batch
  union all
  select id from public.ticket_batches where name = 'LOTE GENERAL 001' limit 1
)
insert into public.tickets (batch_id, event_slug, code, qr_token, qr_url, status)
select
  (select id from selected_batch limit 1),
  'pink-floyd',
  'PF-' || lpad(gs::text, 6, '0'),
  encode(digest('farecoh:pink-floyd:PF-' || lpad(gs::text, 6, '0'), 'sha256'), 'hex'),
  'https://farecoh.org/t/' || encode(digest('farecoh:pink-floyd:PF-' || lpad(gs::text, 6, '0'), 'sha256'), 'hex'),
  'available'
from generate_series(1, 500) as gs
on conflict (code) do nothing;