import postgres from "postgres";
import { env } from "node:process";

declare global {
  // eslint-disable-next-line no-var
  var __farecohSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = env.DATABASE_URL;

if (!connectionString && env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production");
}

export const sql = globalThis.__farecohSql ?? postgres(connectionString ?? "", {
  prepare: false,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

if (env.NODE_ENV !== "production") {
  globalThis.__farecohSql = sql;
}

export type Sql = typeof sql;
export type Transaction = Parameters<Parameters<Sql["transaction"]>[0]>[0];
