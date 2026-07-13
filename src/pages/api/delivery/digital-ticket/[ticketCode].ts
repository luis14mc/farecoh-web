import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicketFromContext } from "@/lib/ticket-delivery-access";
import {
  buildDigitalTicketFilename,
  generateDigitalTicketImage,
} from "@/lib/ticket-delivery";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const { ticketCode } = context.params;
  if (!ticketCode) {
    return new Response("Código de boleto no especificado.", { status: 400 });
  }

  try {
    const { ticket, error } = await fetchDeliverableTicketFromContext(context, ticketCode);
    if (!ticket) {
      return new Response(error ?? "Boleto no encontrado.", { status: ticket ? 400 : 404 });
    }

    const pngBuffer = await generateDigitalTicketImage(ticket.ticket_code, ticket.qr_token);
    const filename = buildDigitalTicketFilename(ticket.ticket_code);
    const isDownload = context.url.searchParams.get("download") === "true";

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado generando la imagen digital.";
    return new Response(message, { status: 500 });
  }
};
