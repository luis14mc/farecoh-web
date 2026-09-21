/**
 * Database client singleton (Supabase-compatible API surface).
 *
 * Migrating from Supabase to plain Postgres — this re-exports the same
 * `db` instance that pages, services, and components have always used
 * via `supabase.from(...)` / `supabase.rpc(...)`.
 *
 * Prefer `sql\`…\`` from `@/lib/db` for new code.
 */
import { db } from "@/lib/db-client";

export const supabase = db;
export const supabaseAdmin = db;
