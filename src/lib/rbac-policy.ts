export type StaffRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";

export const routePermissions: Record<string, StaffRole[]> = {
  "/admin": ["super_admin", "event_manager"],
  "/admin/usuarios": ["super_admin"],
  "/admin/boletos": ["super_admin", "event_manager", "seller"],
  "/admin/lotes": ["super_admin", "event_manager"],
  "/admin/ventas": ["super_admin", "event_manager", "seller"],
  "/admin/checkin": ["super_admin", "event_manager", "checkin_operator"],
  "/admin/reportes": ["super_admin", "event_manager"],
  "/admin/vendedores": ["super_admin", "event_manager"],
  "/admin/no-autorizado": ["super_admin", "event_manager", "seller", "checkin_operator"],
};

export const roleHomePath: Record<StaffRole, string> = {
  super_admin: "/admin",
  event_manager: "/admin",
  seller: "/admin/ventas",
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
