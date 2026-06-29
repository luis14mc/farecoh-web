# Supabase RPC — create_ticket_order

## SQL Function

Run the migration file:

```bash
supabase/migrations/20260629000001_create_ticket_order_rpc.sql
```

Or execute the SQL directly in the Supabase SQL Editor.

### Function Signature

```sql
public.create_ticket_order(
  p_event_slug TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_quantity INTEGER
) RETURNS TABLE (
  order_id UUID,
  customer_id UUID,
  ticket_codes TEXT[],
  total_amount NUMERIC
)
```

### What It Does

1. Validates quantity (1–10)
2. Finds the event by slug (must be `active`)
3. Checks capacity isn't exceeded
4. Finds or creates a customer record
5. Creates an order with status `pending`
6. Creates individual ticket records with codes via `next_ticket_code()`
7. Logs the action in `audit_logs`
8. Returns the order ID, customer ID, ticket codes, and total amount

## Verify the Function Exists

```sql
-- Check function exists in schema
SELECT p.proname, pg_get_function_arguments(p.oid)
FROM pg_proc p
WHERE p.proname = 'create_ticket_order';
```

Expected output:

| proname | pg_get_function_arguments |
|---------|--------------------------|
| create_ticket_order | p_event_slug text, p_full_name text, p_email text, p_phone text, p_quantity integer |

## Test Query

```sql
-- Test (run as authenticated user or service role)
SELECT * FROM public.create_ticket_order(
  'pink-floyd',
  'Test User',
  'test@example.com',
  '+504 9999-0000',
  2
);
```

Expected output:

| order_id | customer_id | ticket_codes | total_amount |
|----------|-------------|--------------|--------------|
| <uuid> | <uuid> | {PF-000001,PF-000002} | 1000.00 |

## Frontend Usage

```typescript
const { data, error } = await supabase.rpc("create_ticket_order", {
  p_event_slug: "pink-floyd",
  p_full_name: "Juan Pérez",
  p_email: "juan@correo.com",
  p_phone: "+504 9999-9999",
  p_quantity: 2,
});

// data[0] = { order_id, customer_id, ticket_codes, total_amount }
```

## Troubleshooting

### 404 Function Not Found

The function hasn't been deployed. Run the migration or execute the SQL in Supabase Editor.

After creating the function, Supabase's PostgREST schema cache may need a reload. The migration includes:

```sql
NOTIFY pgrst, 'reload schema';
```

If the 404 persists, manually restart the Supabase API from the dashboard or wait ~30 seconds for automatic cache refresh.

### "Event not found or inactive"

The event slug doesn't match or the event status is not `active`. Check:

```sql
SELECT slug, status FROM public.events;
```

### "Event capacity exceeded"

Too many tickets already reserved/sold. Check:

```sql
SELECT count(*) FROM public.tickets
WHERE event_id = (SELECT id FROM public.events WHERE slug = 'pink-floyd')
AND status <> 'cancelled';
```
