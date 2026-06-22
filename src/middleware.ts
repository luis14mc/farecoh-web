import { defineMiddleware } from "astro:middleware";
import { requireAdminAccess, roleHomePath } from "@/lib/rbac";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/no-autorizado"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith("/admin")) return next();

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return next();

  const access = await requireAdminAccess(context, pathname).catch(() => ({ ok: false, profile: null, reason: "unauthenticated" as const }));

  if (!access.ok && access.reason === "unauthenticated") {
    const redirectTo = encodeURIComponent(`${pathname}${context.url.search}`);
    return context.redirect(`/admin/login?redirect=${redirectTo}`);
  }

  if (!access.ok && access.reason === "unauthorized") {
    return context.redirect(roleHomePath[access.profile!.role] ?? "/admin/no-autorizado");
  }

  context.locals.staffProfile = access.profile ?? undefined;
  return next();
});