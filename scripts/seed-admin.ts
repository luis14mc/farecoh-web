#!/usr/bin/env node
/**
 * Seed the first super_admin user.
 *
 * Uses ADMIN_EMAIL, ADMIN_FULL_NAME, ADMIN_PASSWORD env vars
 * (defaults to a local development password if unset).
 *
 * Idempotent: re-running updates the password if the user exists.
 */
import bcrypt from "bcryptjs";
import process from "node:process";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "admin@farecoh.org").trim().toLowerCase();
const fullName = process.env.ADMIN_FULL_NAME ?? "FARECOH Admin";
const password = process.env.ADMIN_PASSWORD ?? "changeme1234";

if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, onnotice: () => {} });

try {
  const superAdminRole = await sql<{ id: string }[]>`
    SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1
  `;
  if (superAdminRole.length === 0) {
    console.error("super_admin role not found. Run `pnpm run db:migrate` first.");
    process.exit(1);
  }
  const roleId = superAdminRole[0].id;

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await sql`
    INSERT INTO users (email, full_name, password_hash, role_id, active, updated_at)
    VALUES (${email}, ${fullName}, ${passwordHash}, ${roleId}, true, now())
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      active = true,
      updated_at = now()
    RETURNING id, email, created_at
  `;

  console.log("\n✓ Super admin ready:");
  console.log(`  email:    ${result[0].email}`);
  console.log(`  full name: ${fullName}`);
  console.log(`  id:       ${result[0].id}`);
  console.log(`  password: ${password.replace(/./g, "*")} (set via ADMIN_PASSWORD env var)`);
} finally {
  await sql.end({ timeout: 5 });
}
