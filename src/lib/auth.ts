import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { APIContext, AstroCookies } from "astro";
import { sql } from "@/lib/db";

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

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
  session_id: string;
  csrf_token: string;
  expires_at: string;
}

const SESSION_COOKIE = "farecoh_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24; // refresh after 1 day
const SESSION_GRACE_PERIOD_MS = 1000 * 60 * 60; // expire within grace if clock skew
const BCRYPT_COST = 12;

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super administrador",
  event_manager: "Gestor de eventos",
  seller: "Vendedor",
  checkin_operator: "Operador de acceso",
};

/** @deprecated Use ROLE_LABELS instead */
export const STAFF_ROLE_LABELS = ROLE_LABELS;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET env var must be set (>= 16 chars).");
  }
  return secret;
}

function signSessionId(sessionId: string): string {
  return createHmac("sha256", getSessionSecret()).update(sessionId).digest("base64url");
}

function verifySessionCookie(value: string): { sessionId: string } | null {
  const dot = value.indexOf(".");
  if (dot <= 0 || dot >= value.length - 1) return null;
  const sessionId = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);
  const expectedSig = signSessionId(sessionId);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? { sessionId } : null;
}

function buildCookieValue(sessionId: string): string {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET && process.env.DATABASE_URL);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<
  (UserProfile & { password_hash: string }) | null
> {
  const rows = await sql<UserProfile & { password_hash: string }[]>`
    SELECT u.id, u.email, u.full_name, u.role_id, u.active, u.created_at,
           u.password_hash, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE lower(u.email) = lower(${email})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function authenticate(email: string, password: string): Promise<UserProfile | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.active) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return user;
}

export async function createSession(
  userId: string,
  request: { ip: string | null; userAgent: string | null },
): Promise<{ sessionId: string; csrfToken: string; expiresAt: Date }> {
  const sessionId = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    INSERT INTO sessions (id, user_id, csrf_token, ip_address, user_agent, expires_at)
    VALUES (${sessionId}, ${userId}, ${csrfToken}, ${request.ip}, ${request.userAgent}, ${expiresAt})
  `;

  return { sessionId, csrfToken, expiresAt };
}

export async function destroySession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function loadSession(sessionId: string): Promise<SessionUser | null> {
  const rows = await sql<SessionUser[]>`
    SELECT u.id, u.email, u.full_name, u.role_id, u.active, u.created_at,
           r.name AS role,
           s.id AS session_id, s.csrf_token, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE s.id = ${sessionId}
      AND s.expires_at > now()
      AND u.active = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function shouldRefresh(expiresAt: string): boolean {
  const ttl = new Date(expiresAt).getTime() - Date.now();
  return ttl < SESSION_TTL_MS - SESSION_REFRESH_MS;
}

export async function refreshSession(sessionId: string): Promise<Date | null> {
  const newExpires = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    UPDATE sessions
    SET expires_at = ${newExpires}
    WHERE id = ${sessionId}
  `;
  return newExpires;
}

export function getClientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return null;
}

export function setSessionCookie(cookies: AstroCookies, sessionId: string, expiresAt: Date): void {
  cookies.set(SESSION_COOKIE, buildCookieValue(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(context: APIContext): Promise<SessionUser | null> {
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const verified = verifySessionCookie(raw);
  if (!verified) return null;
  const session = await loadSession(verified.sessionId);
  if (!session) return null;
  if (shouldRefresh(session.expires_at)) {
    const newExpires = await refreshSession(verified.sessionId);
    if (newExpires) {
      setSessionCookie(context.cookies, verified.sessionId, newExpires);
    }
  }
  return session;
}

export async function login(
  context: APIContext,
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await authenticate(email, password);
  if (!user) return null;

  const { sessionId, expiresAt } = await createSession(user.id, {
    ip: getClientIp(context.request),
    userAgent: context.request.headers.get("user-agent"),
  });

  setSessionCookie(context.cookies, sessionId, expiresAt);

  return loadSession(sessionId);
}

export async function logout(context: APIContext): Promise<void> {
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  if (raw) {
    const verified = verifySessionCookie(raw);
    if (verified) {
      await destroySession(verified.sessionId);
    }
  }
  clearSessionCookie(context.cookies);
}

export async function ensureCsrfToken(context: APIContext): Promise<string> {
  const user = await getCurrentUser(context);
  return user?.csrf_token ?? "";
}

export async function pruneExpiredSessions(): Promise<number> {
  const result = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM sessions WHERE expires_at <= now()
  `;
  if ((result[0]?.count ?? 0) === 0) return 0;
  await sql`DELETE FROM sessions WHERE expires_at <= now()`;
  return result[0].count;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_CONSTANTS = {
  TTL_MS: SESSION_TTL_MS,
  REFRESH_MS: SESSION_REFRESH_MS,
  GRACE_PERIOD_MS: SESSION_GRACE_PERIOD_MS,
};
