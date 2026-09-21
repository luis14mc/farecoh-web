import type { APIContext } from "astro";
import type { SessionUser } from "@/lib/auth";
import {
  canAccessRoute,
  canResetTickets,
  normalizeAdminPath,
  resolveAdminAccess,
  roleHomePath,
  routePermissions,
  type AdminAccessReason,
  type StaffRole,
} from "@/lib/rbac-policy";
import { getCurrentUser } from "@/lib/auth";

export { canAccessRoute, canResetTickets, normalizeAdminPath, roleHomePath, routePermissions, resolveAdminAccess };
export type { AdminAccessReason };

function toStaffRole(role: SessionUser["role"]): StaffRole {
  return role as StaffRole;
}

export function hasRole(profile: SessionUser | null | undefined, role: StaffRole): boolean {
  return profile?.role === role;
}

export async function getCurrentUserProfile(context: APIContext): Promise<SessionUser | null> {
  return getCurrentUser(context);
}

export async function requireAdminAccess(
  context: APIContext,
  pathname: string,
): Promise<{
  ok: boolean;
  profile: SessionUser | null;
  reason?: AdminAccessReason;
}> {
  const profile = await getCurrentUser(context);
  const access = resolveAdminAccess({
    hasUser: Boolean(profile),
    profile: profile ? { role: toStaffRole(profile.role) } : null,
    pathname,
  });
  if (!access.ok) {
    return { ok: false, profile, reason: access.reason };
  }
  return { ok: true, profile: profile! };
}
