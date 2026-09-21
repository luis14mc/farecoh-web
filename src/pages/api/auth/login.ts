import type { APIRoute } from "astro";
import { z } from "zod";
import { login } from "@/lib/auth";
import { roleHomePath } from "@/lib/rbac-policy";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
  redirect: z.string().optional(),
});

function sanitizeRedirect(raw: string | undefined): string {
  if (!raw) return "/admin";
  if (raw.startsWith("//")) return "/admin";
  if (!raw.startsWith("/admin")) return "/admin";
  return raw;
}

export const POST: APIRoute = async (context) => {
  let body: unknown;
  const contentType = context.request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await context.request.json();
    } else {
      const formData = await context.request.formData();
      body = Object.fromEntries(formData.entries());
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Cuerpo inválido" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ ok: false, error: "Datos inválidos" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const { email, password } = parsed.data;
  const session = await login(context, email, password);
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: "Credenciales inválidas" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const wantsJson = contentType.includes("application/json");
  const redirect = sanitizeRedirect(parsed.data.redirect ?? new URL(context.request.url).searchParams.get("redirect") ?? undefined);

  if (wantsJson) {
    return new Response(
      JSON.stringify({
        ok: true,
        role: session.role,
        home: roleHomePath[session.role] ?? "/admin",
        redirect,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  return context.redirect(roleHomePath[session.role] ?? redirect, 302);
};
