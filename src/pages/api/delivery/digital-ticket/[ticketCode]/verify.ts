import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicketFromContext } from "@/lib/ticket-delivery-access";
import { formatTicketStatusLabel } from "@/lib/ticket-delivery-identity";
import { verifyDigitalTicketIdentity } from "@/lib/ticket-delivery-verify";
import { normalizeTicketCode } from "@/services/ticket-code";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return Response.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  const { ticketCode } = context.params;
  if (!ticketCode) {
    return Response.json({ ok: false, message: "Código de boleto no especificado." }, { status: 400 });
  }

  const requestedTicketCode = normalizeTicketCode(ticketCode);
  const lookup = await fetchDeliverableTicketFromContext(context, requestedTicketCode);

  if (!lookup.ticket) {
    const status = lookup.notFound ? 404 : lookup.wrongStatus ? 400 : 404;
    return Response.json(
      { ok: false, message: lookup.error ?? "Boleto no encontrado.", identityVerified: false },
      { status },
    );
  }

  const report = verifyDigitalTicketIdentity(requestedTicketCode, lookup.ticket);

  if (!report.ok) {
    const status =
      report.message.includes("no coincide") ? 409 : report.message.includes("qr_token") ? 400 : 400;
    return Response.json(
      {
        ok: false,
        identityVerified: false,
        ticketCode: lookup.ticket.ticket_code,
        status: lookup.ticket.status,
        qrSource: report.qrSource,
        qrUrlMatchesStoredToken: report.qrUrlMatchesStoredToken,
        qrTokenHash: report.qrTokenHash || undefined,
        message: report.message,
      },
      { status },
    );
  }

  return Response.json(
    {
      ok: true,
      identityVerified: true,
      ticketCode: report.ticketCode,
      status: report.status,
      statusLabel: formatTicketStatusLabel(report.status),
      qrSource: report.qrSource,
      qrUrlMatchesStoredToken: report.qrUrlMatchesStoredToken,
      qrTokenHash: report.qrTokenHash,
    },
    { headers: { "cache-control": "no-store" } },
  );
};
