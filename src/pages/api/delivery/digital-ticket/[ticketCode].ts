import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { buildDeliveryDebugHeaders } from "@/lib/ticket-delivery-identity";
import { produceDigitalTicketPng } from "@/lib/ticket-delivery-verify";
import { buildDigitalTicketFilename } from "@/lib/ticket-delivery";
import {
  parseDeliveryTicketCodeParam,
  TicketCodeMismatchError,
} from "@/lib/ticket-delivery-production";
import { resolveDatabaseTicketCode } from "@/services/ticket-code";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const requestedTicketCode = parseDeliveryTicketCodeParam(context.params.ticketCode);
  if (!requestedTicketCode) {
    return new Response("Código de boleto no especificado.", { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient(context);
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, ticket_code, qr_token, status")
      .eq("ticket_code", requestedTicketCode)
      .in("status", ["sold", "validated"])
      .single();

    if (error || !ticket) {
      return new Response(JSON.stringify({ ok: false, message: "Boleto no encontrado." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const ticketCode = String(ticket.ticket_code).trim().toUpperCase();

    if (ticketCode !== requestedTicketCode) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "El código solicitado no coincide con el boleto recuperado.",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }

    resolveDatabaseTicketCode(ticketCode);

    const pngBuffer = await produceDigitalTicketPng(ticket, requestedTicketCode);
    const filename = buildDigitalTicketFilename(ticketCode);
    const isDownload = context.url.searchParams.get("download") === "true";

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "cache-control": "no-store",
        ...buildDeliveryDebugHeaders(ticket),
      },
    });
  } catch (error) {
    if (error instanceof TicketCodeMismatchError) {
      return new Response(
        JSON.stringify({ ok: false, message: error.message }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }

    const message = error instanceof Error ? error.message : "Error inesperado generando la imagen digital.";
    return new Response(message, { status: 500 });
  }
};
