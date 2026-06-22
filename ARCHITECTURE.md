# FARECOH Event Platform Architecture

## Objetivo del MVP

La plataforma queda preparada para operar eventos culturales de FARECOH con un primer evento productivo: `pink-floyd`, Tributo a Pink Floyd 2026. La arquitectura separa experiencia pública, administración, datos transaccionales y validación de ingreso.

## Capas

- `src/pages`: rutas públicas y privadas de Astro.
- `src/components`: piezas visuales reutilizables.
- `src/lib`: integración base y validaciones compartidas.
- `src/services`: lógica de aplicación reusable para órdenes, códigos, check-in y reportes.
- `src/types`: contratos TypeScript entre UI, servicios y base de datos.
- `schema.sql`: modelo PostgreSQL/Supabase con RLS, funciones transaccionales y auditoría.
- `seed.sql`: evento inicial listo para ambiente Supabase.
- `tests`: pruebas de reglas críticas de ticketing.

## Modelo ER

```mermaid
erDiagram
  events ||--o{ orders : receives
  events ||--o{ tickets : issues
  events ||--o{ checkin_operators : tracks
  customers ||--o{ orders : places
  customers ||--o{ tickets : owns
  orders ||--o{ tickets : contains
  tickets ||--o| checkin_operators : validates
  admins ||--o{ checkin_operators : performs
  admins ||--o{ audit_logs : writes

  events {
    uuid id PK
    text slug UK
    text title
    date event_date
    time event_time
    numeric ticket_price
    int capacity
    event_status status
  }

  customers {
    uuid id PK
    text full_name
    text email UK
    text phone
  }

  orders {
    uuid id PK
    uuid event_id FK
    uuid customer_id FK
    int quantity
    numeric total_amount
    order_status status
  }

  tickets {
    uuid id PK
    uuid event_id FK
    uuid order_id FK
    uuid customer_id FK
    text ticket_code UK
    text qr_token UK
    ticket_status status
    timestamptz validated_at
  }

  checkin_operators {
    uuid id PK
    uuid ticket_id UK
    uuid event_id FK
    uuid checked_by FK
    timestamptz checked_at
  }

  admins {
    uuid id PK
    text email UK
    admin_role role
    boolean active
  }

  audit_logs {
    uuid id PK
    uuid actor_id FK
    text action
    text entity
    jsonb old_value
    jsonb new_value
  }
```

## Reglas críticas

- Todo evento público se consulta por `event_slug`.
- Los boletos usan formato `PF-000001` mediante secuencia de PostgreSQL.
- La generación real de órdenes debe ejecutarse en backend o función RPC, no desde cliente público.
- El check-in usa `validate_ticket`, bloquea la fila con `for update` e impide doble validación.
- `checkin_operators.ticket_id` es `unique`, segunda barrera contra duplicados.
- RLS permite lectura pública solo de eventos activos; datos transaccionales quedan para admins o funciones `security definer`.
- `audit_logs` registra creación de órdenes y validaciones.

## Seguridad

- Supabase Auth maneja administradores.
- `admins` referencia `auth.users`.
- Las políticas usan `public.is_admin()`.
- El formulario público debe llamar un endpoint server-side con rate limiting y validación Zod.
- Nunca exponer `service_role` al navegador.

## Próximas fases

1. Crear endpoints Astro server-side para reserva y check-in.
2. Sustituir el mock local por RPCs Supabase.
3. Añadir login admin con Supabase Auth.
4. Añadir QR real por `qr_token` y página/endpoint de verificación.
5. Añadir exportación CSV/PDF para reportes.
