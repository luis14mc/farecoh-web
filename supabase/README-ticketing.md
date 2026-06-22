# FARECOH Physical Ticketing

## Ejecutar en Supabase

1. Ejecutar `supabase/schema-ticketing.sql`.
2. Ejecutar `supabase/seed-tickets.sql`.

Esto crea:

- `ticket_batches`
- `tickets`
- LOTE GENERAL 001
- 500 boletos: `PF-000001` a `PF-000500`

## Asignar boletos a punto físico

Desde `/admin/lotes`:

- Desde: `PF-000001`
- Hasta: `PF-000050`
- Asignado a: nombre del vendedor o responsable
- Punto físico: `Escuela Nacional de Música`

En Supabase también puede usarse:

```sql
select public.assign_ticket_range(
  'PF-000001',
  'PF-000050',
  'Nombre Vendedor',
  'Escuela Nacional de Música'
);
```

## Registrar venta física

Desde `/admin/ventas`:

- Código boleto
- Nombre comprador
- Teléfono
- Correo opcional
- Vendedor
- Punto de venta
- Método de pago
- Referencia opcional

Reglas:

- `available`, `assigned`, `reserved`: se pueden vender.
- `paid`: no se vuelve a vender.
- `validated`: no se vende porque ya ingresó.
- `cancelled`: no se vende.

## Validar ingreso

Desde `/admin/checkin`:

- Buscar `PF-000001`.
- Si está `paid`, permite validar.
- Al validar pasa a `validated` y guarda `validated_at`.
- Si ya está `validated`, muestra alerta de boleto utilizado.
- Si está `available`, `assigned` o `reserved`, muestra boleto no pagado.
- Si está `cancelled`, muestra boleto anulado.

## Fallback local

Mientras se conectan las funciones Supabase a endpoints server-side, las pantallas admin operan con `localStorage` para permitir pruebas inmediatas sin pagos online ni QR.