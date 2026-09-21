import type { APIRoute } from "astro";
import { logout } from "@/lib/auth";

export const POST: APIRoute = async (context) => {
  await logout(context);

  const contentType = context.request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return context.redirect("/admin/login", 302);
};
