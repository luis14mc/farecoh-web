import type { APIContext } from "astro";
import { getStaffProfile, type UserProfile, type StaffRole } from "@/lib/auth";
import {
  canAccessRoute,
  canResetTickets,
  normalizeAdminPath,
  resolveAdminAccess,
  roleHomePath,
  routePermissions,
  type AdminAccessReason,
} from "@/lib/rbac-policy";

export { canAccessRoute, canResetTickets, normalizeAdminPath, roleHomePath, routePermissions, resolveAdminAccess };
export type { AdminAccessReason };

export async function getCurrentUserProfile(context: APIContext): Promise<UserProfile | null> {
  return getStaffProfile(context);
}

export function hasRole(profile: UserProfile | null | undefined, role: StaffRole): boolean {
  return profile?.role === role;
}

export async function requireAdminAccess(
  context: APIContext,
  pathname: string,
  _ignoredClient?: any,
): Promise<{
  ok: boolean;
  profile: UserProfile | null;
  reason?: AdminAccessReason;
}> {
  const profile = await getStaffProfile(context);
  const hasUser = Boolean(profile);

  const access = resolveAdminAccess({ hasUser, profile, pathname });
  if (!access.ok) {
    return { ok: false, profile, reason: access.reason };
  }

  return { ok: true, profile: profile! };
}
