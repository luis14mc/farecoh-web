import type { APIRoute } from "astro";
import { queryOne } from "@/lib/db";
import { verifyPassword, setStaffSession } from "@/lib/auth";

export const POST: APIRoute = async (context) => {
  let email = "";
  let password = "";

  const contentType = context.request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const json = await context.request.json();
      email = (json.email || "").trim().toLowerCase();
      password = json.password || "";
    } catch {
      return new Response(JSON.stringify({ error: "Datos de solicitud inválidos." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  } else {
    try {
      const form = await context.request.formData();
      email = (form.get("email")?.toString() || "").trim().toLowerCase();
      password = form.get("password")?.toString() || "";
    } catch {
      return new Response(JSON.stringify({ error: "Datos de solicitud inválidos." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Correo y contraseña requeridos." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const user = await queryOne(
      "SELECT id, email, password_hash, active FROM users WHERE LOWER(email) = $1 AND active = true LIMIT 1;",
      [email]
    );

    if (!user || !user.password_hash) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    setStaffSession(context, { id: user.id });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("[login] Database error:", err);
    return new Response(JSON.stringify({ error: "Error en el servidor de base de datos." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
