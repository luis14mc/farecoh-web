/**
 * Database client re-export.
 *
 * Use `sql` for tagged-template queries and `sql.unsafe()` for dynamic SQL.
 * Always prefer parameterized values via `sql\`...\`` over string interpolation.
 */
export { sql } from "../../db/client";
export type { Sql } from "../../db/client";
