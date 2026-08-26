import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import {
  addTicketsToMusician,
  createBandMusician,
  deleteBandMusician,
  removeBandTicketAssignment,
} from "@/lib/band-assignments";
import { requireAdminAccess } from "@/lib/rbac";

async function requireBandAssignmentsAccess(context: Parameters<APIRoute>[0]) {
  const access = await requireAdminAccess(context, "/admin/band-assignments");
  if (!access.ok) {
    return { ok: false as const, response: Response.json({ ok: false, message: "No autorizado." }, { status: 403 }) };
  }

  const role = access.profile?.role;
  if (role !== "super_admin" && role !== "event_manager") {
    return {
      ok: false as const,
      response: Response.json({ ok: false, message: "Solo administradores pueden gestionar la banda." }, { status: 403 }),
    };
  }

  return { ok: true as const, profile: access.profile! };
}

export const POST: APIRoute = async (context) => {
  const access = await requireBandAssignmentsAccess(context);
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, message: "JSON inválido." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = String(payload.action ?? "");

  try {
    const supabase = createSupabaseServerClient(context);

    if (action === "create_musician") {
      const musician = await createBandMusician(
        supabase,
        String(payload.name ?? ""),
        typeof payload.notes === "string" ? payload.notes : null,
      );
      return Response.json({ ok: true, musician, message: `${musician.name} registrado.` });
    }

    if (action === "add_tickets") {
      const musicianId = String(payload.musicianId ?? "");
      const ticketCodes = String(payload.ticketCodes ?? "");
      if (!musicianId) {
        return Response.json({ ok: false, message: "Seleccione un músico." }, { status: 400 });
      }

      const result = await addTicketsToMusician(supabase, musicianId, ticketCodes);
      return Response.json({
        ok: true,
        added: result.added,
        skipped: result.skipped,
        message:
          result.added.length > 0
            ? `${result.added.length} boleto(s) asignado(s).`
            : "Los boletos indicados ya estaban asignados a este músico.",
      });
    }

    if (action === "remove_ticket") {
      const assignmentId = String(payload.assignmentId ?? "");
      if (!assignmentId) {
        return Response.json({ ok: false, message: "Asignación no indicada." }, { status: 400 });
      }
      await removeBandTicketAssignment(supabase, assignmentId);
      return Response.json({ ok: true, message: "Boleto quitado de la lista." });
    }

    if (action === "delete_musician") {
      const musicianId = String(payload.musicianId ?? "");
      if (!musicianId) {
        return Response.json({ ok: false, message: "Músico no indicado." }, { status: 400 });
      }
      await deleteBandMusician(supabase, musicianId);
      return Response.json({ ok: true, message: "Músico eliminado de la lista." });
    }

    return Response.json({ ok: false, message: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar la operación.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
};
