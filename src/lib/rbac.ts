import type { APIContext } from "astro";
import { createSupabaseServerClient, type StaffProfile, type StaffRole } from "@/lib/auth";
import {
  canAccessRoute,
  normalizeAdminPath,
  roleHomePath,
  routePermissions,
} from "@/lib/rbac-policy";

export { canAccessRoute, normalizeAdminPath, roleHomePath, routePermissions };

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
