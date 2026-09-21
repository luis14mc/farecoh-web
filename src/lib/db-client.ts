/**
 * Lightweight Supabase-compatible query builder backed by the postgres.js client.
 *
 * Supports the subset of the Supabase JS API used in this codebase:
 *   .from(table).select(cols).eq(col, val).order(col, {ascending}).limit(n).single()
 *   .from(table).insert(row)
 *   .from(table).update(partial).eq(col, val)
 *   .rpc(name, args)
 *
 * This lets admin pages, components, and API routes compile and run while
 * we incrementally rewrite them with `sql\`…\`` directly. Eventually this
 * shim can be removed.
 *
 * NOT supported: storage, auth.* (sessions are handled in src/lib/auth.ts),
 * realtime, postgrest functions, complex chained filters. For those, use
 * `sql` from src/lib/db.ts directly.
 */
import { sql } from "@/lib/db";

export class QueryError extends Error {
  readonly code: string;
  constructor(message: string, code = "PGRST_ERROR") {
    super(message);
    this.code = code;
    this.name = "QueryError";
  }
}

interface Filter {
  column: string;
  op: "eq" | "neq" | "in" | "is" | "gte" | "lte" | "gt" | "lt" | "like" | "ilike" | "not" | "nin";
  value: unknown;
}

interface Order {
  column: string;
  ascending: boolean;
  nullsFirst: boolean;
}

interface PendingInsert {
  kind: "insert";
  rows: unknown[];
}

interface PendingUpdate {
  kind: "update";
  data: Record<string, unknown>;
}

type Pending = PendingInsert | PendingUpdate;

class Query<T = Record<string, unknown>> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private singleRow = false;
  private maybeSingle = false;
  private selectColumns = "*";
  private headCount = false;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly table: string,
    private readonly pending: Pending | null,
  ) {}

  select(columns = "*", options: { head?: boolean; count?: string } = {}): Query<T> {
    this.selectColumns = columns;
    this.headCount = options.head === true;
    return this as unknown as Query<T>;
  }

  insert(rows: unknown | unknown[]): Query<T> {
    const arr = Array.isArray(rows) ? rows : [rows];
    (this as unknown as { pending: Pending | null }).pending = { kind: "insert", rows: arr };
    return this as unknown as Query<T>;
  }

  update(data: Record<string, unknown>): Query<T> {
    (this as unknown as { pending: Pending | null }).pending = { kind: "update", data };
    return this as unknown as Query<T>;
  }

  eq(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "eq", value });
    return this as unknown as Query<T>;
  }
  neq(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "neq", value });
    return this as unknown as Query<T>;
  }
  not(column: string, op: string, value: unknown): Query<T> {
    if (op === "in") {
      this.filters.push({ column, op: "nin", value });
    } else if (op === "eq") {
      this.filters.push({ column, op: "neq", value });
    } else if (op === "is") {
      const isValue = value === null ? "NOT NULL" : "NULL";
      this.filters.push({ column, op: "is", value: isValue });
    } else {
      throw new Error(`shim does not support .not(col, '${op}', value)`);
    }
    return this as unknown as Query<T>;
  }
  in(column: string, values: unknown[]): Query<T> {
    this.filters.push({ column, op: "in", value: values });
    return this as unknown as Query<T>;
  }
  is(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "is", value });
    return this as unknown as Query<T>;
  }
  gte(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "gte", value });
    return this as unknown as Query<T>;
  }
  lte(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "lte", value });
    return this as unknown as Query<T>;
  }
  gt(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "gt", value });
    return this as unknown as Query<T>;
  }
  lt(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "lt", value });
    return this as unknown as Query<T>;
  }
  like(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "like", value });
    return this as unknown as Query<T>;
  }
  ilike(column: string, value: unknown): Query<T> {
    this.filters.push({ column, op: "ilike", value });
    return this as unknown as Query<T>;
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}): Query<T> {
    this.orders.push({
      column,
      ascending: options.ascending ?? true,
      nullsFirst: options.nullsFirst ?? false,
    });
    return this as unknown as Query<T>;
  }

  limit(n: number): Query<T> {
    this.limitN = n;
    return this as unknown as Query<T>;
  }

  range(_from: number, _to: number): Query<T> {
    return this as unknown as Query<T>;
  }

  single(): Promise<{ data: T | null; error: QueryError | null }> {
    this.singleRow = true;
    return this.run() as unknown as Promise<{ data: T | null; error: QueryError | null }>;
  }

  maybeSingle(): Promise<{ data: T | null; error: QueryError | null }> {
    this.maybeSingle = true;
    return this.run() as unknown as Promise<{ data: T | null; error: QueryError | null }>;
  }

  then<TResult1 = { data: T[] | T | null; error: QueryError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | T | null; error: QueryError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private async run(): Promise<{ data: T[] | T | null; error: QueryError | null }> {
    try {
      if (this.pending?.kind === "insert") {
        const result = await this.executor.insert(this.table, this.pending.rows, this.selectColumns);
        return { data: result as T[] as unknown as T, error: null };
      }
      if (this.pending?.kind === "update") {
        const result = await this.executor.update(this.table, this.pending.data, this.filters, this.selectColumns);
        return { data: result as T[] as unknown as T, error: null };
      }
      const result = await this.executor.select<T>({
        table: this.table,
        columns: this.selectColumns,
        filters: this.filters,
        orders: this.orders,
        limit: this.limitN,
        single: this.singleRow || this.maybeSingle,
      });
      if (this.singleRow) {
        if (result.length === 0) {
          return { data: null, error: new QueryError("No rows found") };
        }
        if (result.length > 1 && !this.maybeSingle) {
          return { data: null, error: new QueryError("Multiple rows returned for .single()") };
        }
        return { data: result[0] as T, error: null };
      }
      return { data: result as T[] as unknown as T, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: null, error: new QueryError(message) };
    }
  }
}

class QueryExecutor {
  async select<T>(opts: {
    table: string;
    columns: string;
    filters: Filter[];
    orders: Order[];
    limit: number | null;
    single: boolean;
  }): Promise<T[]> {
    const where = buildWhere(opts.filters);
    const orderBy = buildOrderBy(opts.orders);
    const limit = opts.limit !== null ? ` LIMIT ${opts.limit}` : "";
    const query = `SELECT ${opts.columns} FROM ${quoteIdent(opts.table)}${where}${orderBy}${limit}`;
    return sql.unsafe<T[]>(query) as unknown as Promise<T[]>;
  }

  async insert(table: string, rows: unknown[], returning: string): Promise<unknown[]> {
    if (rows.length === 0) return [];
    const first = rows[0] as Record<string, unknown>;
    const columns = Object.keys(first);
    const rowsSql = rows
      .map((_, i) => {
        const placeholders = columns.map((__, j) => `$${i * columns.length + j + 1}`).join(", ");
        return `(${placeholders})`;
      })
      .join(", ");
    const flat = rows.flatMap((r) => columns.map((c) => (r as Record<string, unknown>)[c]));
    const query = `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES ${rowsSql} RETURNING ${returning}`;
    return sql.unsafe(query, flat);
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    filters: Filter[],
    returning: string,
  ): Promise<unknown[]> {
    const setEntries = Object.entries(data);
    const setSql = setEntries.map(([k], i) => `${quoteIdent(k)} = $${i + 1}`).join(", ");
    const where = buildWhere(filters, setEntries.length);
    const query = `UPDATE ${quoteIdent(table)} SET ${setSql}${where} RETURNING ${returning}`;
    const values = [...setEntries.map(([, v]) => v), ...filterValues(filters)];
    return sql.unsafe(query, values);
  }
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function filterValues(filters: Filter[]): unknown[] {
  const out: unknown[] = [];
  for (const f of filters) {
    if (f.op === "in") {
      out.push(Array.isArray(f.value) ? f.value : f.value);
    } else {
      out.push(f.value);
    }
  }
  return out;
}

function buildWhere(filters: Filter[], offset = 0): string {
  if (filters.length === 0) return "";
  const parts = filters.map((f, i) => {
    const idx = offset + i + 1;
    switch (f.op) {
      case "eq":
        return `${quoteIdent(f.column)} = $${idx}`;
      case "neq":
        return `${quoteIdent(f.column)} <> $${idx}`;
      case "is":
        return `${quoteIdent(f.column)} IS ${f.value === null ? "NULL" : "NOT NULL"}`;
      case "in":
        return `${quoteIdent(f.column)} = ANY($${idx}::text[])`;
      case "gte":
        return `${quoteIdent(f.column)} >= $${idx}`;
      case "lte":
        return `${quoteIdent(f.column)} <= $${idx}`;
      case "gt":
        return `${quoteIdent(f.column)} > $${idx}`;
      case "lt":
        return `${quoteIdent(f.column)} < $${idx}`;
      case "like":
        return `${quoteIdent(f.column)} LIKE $${idx}`;
      case "ilike":
        return `${quoteIdent(f.column)} ILIKE $${idx}`;
      case "nin":
        return `NOT (${quoteIdent(f.column)} = ANY($${idx}::text[]))`;
    }
  });
  return ` WHERE ${parts.join(" AND ")}`;
}

function buildOrderBy(orders: Order[]): string {
  if (orders.length === 0) return "";
  const parts = orders.map((o) => {
    const dir = o.ascending ? "ASC" : "DESC";
    const nulls = o.nullsFirst ? "NULLS FIRST" : "NULLS LAST";
    return `${quoteIdent(o.column)} ${dir} ${nulls}`;
  });
  return ` ORDER BY ${parts.join(", ")}`;
}

const executor = new QueryExecutor();

export interface DbClient {
  from<T = Record<string, unknown>>(table: string): Query<T>;
  rpc<T = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: QueryError | null }>;
}

function createDbClient(): DbClient {
  return {
    from<T = Record<string, unknown>>(table: string): Query<T> {
      return new Query<T>(executor, table, null);
    },
    async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: QueryError | null }> {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        return { data: null, error: new QueryError(`Unsafe function name: ${name}`) };
      }
      const entries = Object.entries(args);
      const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
      const values = entries.map(([, v]) => v);
      const query = entries.length === 0
        ? `SELECT * FROM ${name}()`
        : `SELECT * FROM ${name}(${placeholders})`;
      try {
        const rows = await sql.unsafe<unknown[]>(query, values);
        return { data: (rows[0] ?? null) as T, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: new QueryError(message) };
      }
    },
  };
}

export const db: DbClient = createDbClient();
