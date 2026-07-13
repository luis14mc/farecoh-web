import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicketFromContext } from "@/lib/ticket-delivery-access";
import {
  buildPhysicalTicketFilename,
  generatePhysicalTicketImage,
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
    const lookup = await fetchDeliverableTicketFromContext(context, ticketCode);
    if (!lookup.ticket) {
      const status = lookup.notFound ? 404 : lookup.wrongStatus ? 400 : 404;
      return new Response(lookup.error ?? "Boleto no encontrado.", { status });
    }

    const pngBuffer = await generatePhysicalTicketImage(lookup.ticket.ticket_code, lookup.ticket.qr_token);
    const filename = buildPhysicalTicketFilename(lookup.ticket.ticket_code);
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
    const message = error instanceof Error ? error.message : "Error inesperado generando la imagen física.";
    return new Response(message, { status: 500 });
  }
};
