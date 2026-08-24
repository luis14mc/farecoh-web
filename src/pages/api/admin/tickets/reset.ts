import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { canResetTickets, requireAdminAccess } from "@/lib/rbac";
import { parseTicketCodesInput, resetTicketsToAvailable } from "@/lib/ticket-reset";

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/tickets");
  if (!access.ok) {
    return Response.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  if (!canResetTickets(access.profile)) {
    return Response.json(
      { ok: false, message: "Solo administradores pueden revertir boletos." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, message: "JSON inválido." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawCodes = Array.isArray(payload.ticketCodes)
    ? payload.ticketCodes.map(String).join(" ")
    : typeof payload.ticketCodes === "string"
      ? payload.ticketCodes
      : "";

  const ticketCodes = parseTicketCodesInput(rawCodes);
  if (ticketCodes.length === 0) {
    return Response.json({ ok: false, message: "Indique al menos un código PF-XXXXXX." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient(context);
    const performedBy = access.profile?.email ?? access.profile?.full_name ?? "admin";
    const result = await resetTicketsToAvailable(supabase, ticketCodes, { performedBy });

    return Response.json({
      ok: true,
      reset: result.reset,
      skipped: result.skipped,
      message:
        result.reset.length > 0
          ? `${result.reset.length} boleto(s) revertido(s) a disponible.`
          : "Los boletos indicados ya estaban disponibles.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo revertir el boleto.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
};
