import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient, isAuthConfigured } from "@/lib/auth";
import { requireAdminAccess, roleHomePath } from "@/lib/rbac";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/no-autorizado", "/admin/reset-password"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith("/admin")) return next();

  if (!isAuthConfigured()) {
    if (PUBLIC_ADMIN_PATHS.has(pathname)) return next();
    return new Response("Admin auth is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createSupabaseServerClient(context);
  await supabase.auth.getUser();

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return next();

  const access = await requireAdminAccess(context, pathname, supabase).catch(() => ({
    ok: false as const,
    profile: null,
    reason: "unauthenticated" as const,
  }));

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
