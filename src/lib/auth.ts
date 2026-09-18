import type { APIContext } from "astro";
import crypto from "node:crypto";
import { queryOne } from "./db.ts";

export type StaffRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super administrador",
  event_manager: "Gestor de eventos",
  seller: "Vendedor",
  checkin_operator: "Operador de acceso",
};

export const STAFF_ROLE_LABELS = ROLE_LABELS;

const SESSION_COOKIE_NAME = "farecoh_staff_session";
const AUTH_SECRET = process.env.AUTH_SECRET || (typeof import.meta !== "undefined" && import.meta.env?.AUTH_SECRET) || "farecoh_default_session_secret_key_32bytes_long";

export function isAuthConfigured(): boolean {
  return true;
}

/**
 * Hash password with scrypt using salt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify password against salt:hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Sign session payload using HMAC-SHA256.
 */
export function signSessionPayload(payload: Record<string, any>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verify and decode signed session payload.
 */
export function verifySessionPayload<T = any>(token: string): T | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(data)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload as T;
  } catch {
    return null;
  }
}

/**
 * Get authenticated staff profile from context session cookie.
 */
export async function getStaffProfile(context: APIContext): Promise<UserProfile | null> {
  const cookie = context.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;

  const payload = verifySessionPayload<{ userId: string; exp: number }>(cookie.value);
  if (!payload?.userId) return null;

  try {
    const sql = `
      SELECT u.id, u.email, u.full_name, u.role_id, u.active, u.created_at, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.active = true
      LIMIT 1;
    `;
    const row = await queryOne(sql, [payload.userId]);
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role_id: row.role_id,
      role: row.role_name as StaffRole,
      active: row.active,
      created_at: row.created_at,
    };
  } catch (err) {
    console.error("[auth] Error reading staff profile from DB:", err);
    return null;
  }
}

/**
 * Create a session for a user and set the HTTP-only cookie.
 */
export function setStaffSession(context: APIContext, user: { id: string }): void {
  const expiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = signSessionPayload({
    userId: user.id,
    exp: Date.now() + expiresInMs,
  });

  context.cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
}

/**
 * Clear the staff session cookie.
 */
export function clearStaffSession(context: APIContext): void {
  context.cookies.delete(SESSION_COOKIE_NAME, {
    path: "/",
  });
}
