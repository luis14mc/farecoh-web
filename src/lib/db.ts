import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || (typeof import.meta !== "undefined" && import.meta.env?.DATABASE_URL) || "";

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const isSslRequired =
      databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("roundhouse.proxy.rlwy.net") ||
      process.env.NODE_ENV === "production";

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[db] Unexpected idle client error:", err);
    });
  }

  return pool;
}

/**
 * Execute a SQL query with parameters.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getDbPool();
  return p.query<T>(text, params);
}

/**
 * Query and return the first row, or null if none found.
 */
export async function queryOne<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] ?? null;
}

/**
 * Query and return all rows.
 */
export async function queryRows<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const res = await query<T>(text, params);
  return res.rows;
}

/**
 * Call a PostgreSQL stored function (RPC).
 * Supports positional array or named arguments object.
 */
export async function rpc<T = any>(
  functionName: string,
  args?: any[] | Record<string, any>
): Promise<T> {
  if (Array.isArray(args)) {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `SELECT * FROM ${functionName}(${placeholders});`;
    const res = await query(sql, args);
    return res.rows as unknown as T;
  }

  if (args && typeof args === "object") {
    const keys = Object.keys(args);
    const params = Object.values(args);
    const assignments = keys.map((k, i) => `${k} := $${i + 1}`).join(", ");
    const sql = `SELECT * FROM ${functionName}(${assignments});`;
    const res = await query(sql, params);
    return res.rows as unknown as T;
  }

  const sql = `SELECT * FROM ${functionName}();`;
  const res = await query(sql);
  return res.rows as unknown as T;
}

export default {
  query,
  queryOne,
  queryRows,
  rpc,
  getDbPool,
};
