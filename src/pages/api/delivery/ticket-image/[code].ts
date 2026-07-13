import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicketFromContext } from "@/lib/ticket-delivery-access";
import { buildDeliveryDebugHeaders } from "@/lib/ticket-delivery-identity";
import { produceDigitalTicketPng } from "@/lib/ticket-delivery-verify";
import { buildDigitalTicketFilename } from "@/lib/ticket-delivery";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const { code } = context.params;
  if (!code) {
    return new Response("Código de boleto no especificado.", { status: 400 });
  }

  try {
    const lookup = await fetchDeliverableTicketFromContext(context, code);
    if (!lookup.ticket) {
      const status = lookup.notFound ? 404 : lookup.wrongStatus ? 400 : 404;
      return new Response(lookup.error ?? "Boleto no encontrado.", { status });
    }

    const pngBuffer = await produceDigitalTicketPng(lookup.ticket);
    const filename = buildDigitalTicketFilename(lookup.ticket.ticket_code);
    const isDownload = context.url.searchParams.get("download") === "true";

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "cache-control": "no-store",
        ...buildDeliveryDebugHeaders(lookup.ticket),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado generando la imagen del boleto.";
    return new Response(message, { status: 500 });
  }
};
