import { defineMiddleware } from "astro:middleware";
import { isAuthConfigured } from "@/lib/auth";
import { requireAdminAccess, roleHomePath } from "@/lib/rbac";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/no-autorizado", "/admin/reset-password"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const apiEvents = /^\/api\/admin\/events(?:\/|$)/.test(pathname);
  if (!apiEvents && !pathname.startsWith("/admin")) return next();

  if (!isAuthConfigured()) {
    if (PUBLIC_ADMIN_PATHS.has(pathname)) return next();
    return new Response("Admin auth is not configured. Set DATABASE_URL and AUTH_SECRET.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return next();

  const access = await requireAdminAccess(context, apiEvents ? "/admin/events" : pathname).catch(() => ({
    ok: false as const,
    profile: null,
    reason: "unauthenticated" as const,
  }));

  if (apiEvents && !access.ok) {
    const unauthorized = access.reason === "unauthenticated";
    return Response.json({ error: unauthorized ? "Inicia sesión." : "Acceso denegado." }, {
      status: unauthorized ? 401 : 403,
    });
  }

  if (!access.ok && access.reason === "unauthenticated") {
    const redirectTo = encodeURIComponent(`${pathname}${context.url.search}`);
    return context.redirect(`/admin/login?redirect=${redirectTo}`);
  }

  if (!access.ok && access.reason === "no_profile") {
    return context.redirect("/admin/no-autorizado");
  }

  if (!access.ok && access.reason === "unauthorized") {
    const fallback = roleHomePath[access.profile!.role] ?? "/admin/no-autorizado";
    if (normalizePath(pathname) === normalizePath(fallback)) {
      return context.redirect("/admin/no-autorizado");
    }
    return context.redirect(fallback);
  }

  context.locals.staffProfile = access.profile ?? undefined;
  return next();
});

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}
