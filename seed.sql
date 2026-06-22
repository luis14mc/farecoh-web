-- FARECOH Event Platform seed data

insert into public.events (
  slug,
  title,
  description,
  location,
  city,
  event_date,
  event_time,
  ticket_price,
  capacity,
  status
)
values (
  'pink-floyd',
  'Tributo a Pink Floyd 2026',
  'Evento cultural benéfico para fortalecer programas de formación artística, música coral y educación humana a través de FARECOH.',
  'Escuela Nacional de Música',
  'Tegucigalpa',
  date '2026-08-08',
  time '20:00',
  500.00,
  500,
  'active'
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  city = excluded.city,
  event_date = excluded.event_date,
  event_time = excluded.event_time,
  ticket_price = excluded.ticket_price,
  capacity = excluded.capacity,
  status = excluded.status,
  updated_at = now();