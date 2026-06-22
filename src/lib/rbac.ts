import type { APIContext } from "astro";
import { createSupabaseServerClient, type StaffProfile, type StaffRole } from "@/lib/auth";

export const routePermissions: Record<string, StaffRole[]> = {
  "/admin": ["super_admin", "event_manager"],
  "/admin/usuarios": ["super_admin"],
  "/admin/boletos": ["super_admin", "event_manager", "seller"],
  "/admin/lotes": ["super_admin", "event_manager"],
  "/admin/ventas": ["super_admin", "event_manager", "seller"],
  "/admin/checkin": ["super_admin", "event_manager", "checkin_operator"],
  "/admin/reportes": ["super_admin", "event_manager"],
  "/admin/vendedores": ["super_admin", "event_manager"],
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

export async function getCurrentUserProfile(context: APIContext): Promise<StaffProfile | null> {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id, user_id, email, full_name, role, active, created_at")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .single();

  if (error || !data) return null;
  return data as StaffProfile;
}

export function hasRole(profile: StaffProfile | null | undefined, role: StaffRole): boolean {
  return profile?.role === role;
}

export function canAccessRoute(role: StaffRole, pathname: string): boolean {
  const route = normalizeAdminPath(pathname);
  return routePermissions[route]?.includes(role) ?? false;
}

export async function requireAdminAccess(context: APIContext, pathname: string): Promise<{
  ok: boolean;
  profile: StaffProfile | null;
  reason?: "unauthenticated" | "unauthorized";
}> {
  const profile = await getCurrentUserProfile(context);
  if (!profile) return { ok: false, profile: null, reason: "unauthenticated" };
  if (!canAccessRoute(profile.role, pathname)) return { ok: false, profile, reason: "unauthorized" };
  return { ok: true, profile };
}