/**
 * Role labels — pure constants, safe for client and server.
 *
 * The actual authorization logic and DB-touching code lives in
 * `@/lib/auth.ts` (server-only) and `@/lib/rbac.ts`.
 */

export type StaffRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super administrador",
  event_manager: "Gestor de eventos",
  seller: "Vendedor",
  checkin_operator: "Operador de acceso",
};

/** @deprecated Use ROLE_LABELS instead */
export const STAFF_ROLE_LABELS = ROLE_LABELS;
