import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, type UserProfile, type StaffRole } from "@/lib/auth";
import {
  canAccessRoute,
  normalizeAdminPath,
  resolveAdminAccess,
  roleHomePath,
  routePermissions,
  type AdminAccessReason,
} from "@/lib/rbac-policy";
import type { Database } from "@/types/database";

export { canAccessRoute, normalizeAdminPath, roleHomePath, routePermissions, resolveAdminAccess };
export type { AdminAccessReason };

function mapStaffProfile(data: {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role_id: string;
  active: boolean;
  created_at: string;
  roles: { name: string } | null;
}): UserProfile {
  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    email: data.email,
    full_name: data.full_name,
    role_id: data.role_id,
    role: data.roles?.name as StaffRole,
    active: data.active,
    created_at: data.created_at,
  };
}

async function fetchStaffProfile(
  supabase: SupabaseClient<Database>,
  authUserId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, full_name, role_id, active, created_at, roles(name)")
    .eq("auth_user_id", authUserId)
    .eq("active", true)
    .single();

  if (error || !data) return null;
  return mapStaffProfile(data as Parameters<typeof mapStaffProfile>[0]);
}

export async function getCurrentUserProfile(context: APIContext): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) return null;
  return fetchStaffProfile(supabase, userData.user.id);
}

export function hasRole(profile: UserProfile | null | undefined, role: StaffRole): boolean {
  return profile?.role === role;
}

export async function requireAdminAccess(
  context: APIContext,
  pathname: string,
  existingClient?: SupabaseClient<Database>,
): Promise<{
  ok: boolean;
  profile: UserProfile | null;
  reason?: AdminAccessReason;
}> {
  const supabase = existingClient ?? createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const hasUser = !userError && Boolean(userData.user);
  const profile = hasUser && userData.user ? await fetchStaffProfile(supabase, userData.user.id) : null;

  const access = resolveAdminAccess({ hasUser, profile, pathname });
  if (!access.ok) {
    return { ok: false, profile, reason: access.reason };
  }

  return { ok: true, profile: profile! };
}
