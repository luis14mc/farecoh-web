import type { APIContext } from "astro";
import { canAccessRoute } from "@/lib/rbac";
import { EventError } from "./event-input";

export async function readEventInput(request: Request): Promise<Record<string, unknown>> {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new EventError("JSON inválido.");
  return input;
}

export async function eventResponse(context: APIContext, run: (actor: string) => Promise<unknown>, status = 200) {
  const profile = context.locals.staffProfile;
  if (!profile) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!canAccessRoute(profile.role, "/admin/events")) {
    return Response.json({ error: "Acceso denegado." }, { status: 403 });
  }
  try {
    return Response.json(await run(profile.email), { status });
  } catch (error) {
    if (error instanceof EventError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Error al gestionar eventos:", error);
    return Response.json({ error: "No se pudo completar la operación." }, { status: 500 });
  }
}
