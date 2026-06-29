import type { APIContext } from "astro";
import { createSupabaseServerClient, type UserProfile, type StaffRole } from "@/lib/auth";
import {
  canAccessRoute,
  normalizeAdminPath,
  roleHomePath,
  routePermissions,
} from "@/lib/rbac-policy";

export { canAccessRoute, normalizeAdminPath, roleHomePath, routePermissions };

export async function getCurrentUserProfile(context: APIContext): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, full_name, role_id, active, created_at, roles(name)")
    .eq("auth_user_id", userData.user.id)
    .eq("active", true)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    email: data.email,
    full_name: data.full_name,
    role_id: data.role_id,
    role: data.roles?.name as StaffRole,
    active: data.active,
    created_at: data.created_at,
  } as UserProfile;
}

export function hasRole(profile: UserProfile | null | undefined, role: StaffRole): boolean {
  return profile?.role === role;
}

export async function requireAdminAccess(context: APIContext, pathname: string): Promise<{
  ok: boolean;
  profile: UserProfile | null;
  reason?: "unauthenticated" | "unauthorized";
}> {
  const profile = await getCurrentUserProfile(context);
  if (!profile) return { ok: false, profile: null, reason: "unauthenticated" };
  if (!canAccessRoute(profile.role, pathname)) return { ok: false, profile, reason: "unauthorized" };
  return { ok: true, profile };
}
