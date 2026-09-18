import type { APIRoute } from "astro";
import { clearStaffSession } from "@/lib/auth";

export const ALL: APIRoute = async (context) => {
  clearStaffSession(context);

  if (context.request.headers.get("accept")?.includes("application/json")) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return context.redirect("/admin/login");
};
