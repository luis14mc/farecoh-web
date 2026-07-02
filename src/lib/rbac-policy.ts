export type StaffRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";

export type AdminAccessReason = "unauthenticated" | "no_profile" | "unauthorized";

export interface StaffProfileLike {
  role: StaffRole;
}

export function resolveAdminAccess(params: {
  hasUser: boolean;
  profile: StaffProfileLike | null;
  pathname: string;
}): { ok: true } | { ok: false; reason: AdminAccessReason } {
  if (!params.hasUser) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (!params.profile) {
    return { ok: false, reason: "no_profile" };
  }

  if (!canAccessRoute(params.profile.role, params.pathname)) {
    return { ok: false, reason: "unauthorized" };
  }

  return { ok: true };
}

export const routePermissions: Record<string, StaffRole[]> = {
  "/admin": ["super_admin", "event_manager"],
  "/admin/dashboard": ["super_admin", "event_manager"],
  "/admin/users": ["super_admin"],
  "/admin/tickets": ["super_admin", "event_manager", "seller"],
  "/admin/reservations": ["super_admin", "event_manager", "seller"],
  "/admin/batches": ["super_admin", "event_manager"],
  "/admin/sales": ["super_admin", "event_manager", "seller"],
  "/admin/checkin": ["super_admin", "event_manager", "checkin_operator"],
  "/admin/reports": ["super_admin", "event_manager"],
  "/admin/printing": ["super_admin", "event_manager"],
  "/admin/vendors": ["super_admin", "event_manager"],
  "/admin/no-autorizado": ["super_admin", "event_manager", "seller", "checkin_operator"],
};

export const roleHomePath: Record<StaffRole, string> = {
  super_admin: "/admin",
  event_manager: "/admin",
  seller: "/admin/sales",
  checkin_operator: "/admin/checkin",
};

export function normalizeAdminPath(pathname: string): string {
  const clean = pathname.replace(/\/$/, "") || "/admin";
  if (clean === "/admin") return clean;
  const segments = clean.split("/").filter(Boolean);
  if (segments[0] !== "admin") return clean;
  return `/${segments.slice(0, 2).join("/")}`;
}

export function canAccessRoute(role: StaffRole, pathname: string): boolean {
  const route = normalizeAdminPath(pathname);
  return routePermissions[route]?.includes(role) ?? false;
}
