import type { APIRoute } from "astro";
import { rpc } from "@/lib/db";
import { requireAdminAccess } from "@/lib/rbac";
import { normalizeTicketCode } from "@/services/ticket-code";

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/checkin");
  if (!access.ok) {
    return Response.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, message: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const ticketCode = body.ticketCode ? normalizeTicketCode(String(body.ticketCode)) : null;
  const qrToken = body.qrToken ? String(body.qrToken).trim() : null;
  const validatedBy = body.validatedBy || access.profile?.email || access.profile?.full_name || "admin-checkin";

  if (!ticketCode && !qrToken) {
    return Response.json({ ok: false, message: "Indique ticketCode o qrToken." }, { status: 400 });
  }

  try {
    let rows: Array<{
      ok: boolean;
      message: string;
      ticket_id: string | null;
      ticket_code: string;
      status: string | null;
      validated_at: string | null;
    }>;

    if (qrToken) {
      rows = await rpc("validate_ticket_by_qr", [qrToken, validatedBy]);
    } else {
      rows = await rpc("validate_ticket", [ticketCode!, validatedBy]);
    }

    const result = rows?.[0];
    if (!result) {
      return Response.json({ ok: false, message: "Sin respuesta de validación." }, { status: 500 });
    }

    return Response.json({
      ok: result.ok,
      message: result.message,
      ticket_code: result.ticket_code,
      validated_at: result.validated_at,
      status: result.status,
    });
  } catch (error: any) {
    return Response.json({ ok: false, message: error?.message || "Error al validar boleto." }, { status: 500 });
  }
};
