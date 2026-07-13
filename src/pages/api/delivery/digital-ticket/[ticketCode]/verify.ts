import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicketFromContext } from "@/lib/ticket-delivery-access";
import { formatTicketStatusLabel } from "@/lib/ticket-delivery-identity";
import {
  produceVerifiedDigitalTicketPng,
  TicketDeliveryVerificationError,
} from "@/lib/ticket-delivery-verify";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return Response.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  const { ticketCode } = context.params;
  if (!ticketCode) {
    return Response.json({ ok: false, message: "Código de boleto no especificado." }, { status: 400 });
  }

  try {
    const lookup = await fetchDeliverableTicketFromContext(context, ticketCode);
    if (!lookup.ticket) {
      const status = lookup.notFound ? 404 : lookup.wrongStatus ? 400 : 404;
      return Response.json(
        { ok: false, message: lookup.error ?? "Boleto no encontrado.", qrVerified: false },
        { status },
      );
    }

    const supabase = createSupabaseServerClient(context);
    const { report } = await produceVerifiedDigitalTicketPng(supabase, ticketCode, lookup.ticket);

    return Response.json(
      {
        ok: true,
        ticketCode: lookup.ticket.ticket_code,
        status: lookup.ticket.status,
        statusLabel: formatTicketStatusLabel(lookup.ticket.status),
        qrVerified: report.ok,
        codeVisible: report.codeVisible,
        layoutSource: report.layoutSource,
        renderedTicket: report.renderedTicket,
        qrDecodedMatch: report.qrDecodedMatch,
        publicTicketResolved: report.publicTicketResolved,
        qrTokenModified: report.qrTokenModified,
        ticketCodeModified: report.ticketCodeModified,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof TicketDeliveryVerificationError) {
      return Response.json(
        {
          ok: false,
          qrVerified: false,
          message: error.report.message,
          report: error.report,
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "Verification failed.";
    return Response.json({ ok: false, qrVerified: false, message }, { status: 500 });
  }
};
