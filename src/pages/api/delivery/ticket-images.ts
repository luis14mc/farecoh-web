import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchDeliverableTicket } from "@/lib/ticket-delivery-access";
import { produceDigitalTicketPng } from "@/lib/ticket-delivery-verify";
import { buildDigitalTicketFilename } from "@/lib/ticket-delivery";
import { normalizeTicketCode } from "@/services/ticket-code";
import JSZip from "jszip";

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { ticketCodes } = body;

    if (!Array.isArray(ticketCodes) || ticketCodes.length === 0) {
      return new Response("Indique al menos un código de boleto.", { status: 400 });
    }

    if (ticketCodes.length > 10) {
      return new Response("El límite máximo es de 10 boletos por solicitud.", { status: 400 });
    }

    const supabase = createSupabaseServerClient(context);
    const normalizedCodes = ticketCodes.map((code) => normalizeTicketCode(String(code)));
    const generatedTickets: Array<{ ticket_code: string; pngBuffer: Buffer }> = [];

    for (const ticketCode of normalizedCodes) {
      const lookup = await fetchDeliverableTicket(supabase, ticketCode);
      if (!lookup.ticket) {
        return new Response(lookup.error ?? `Boleto no encontrado: ${ticketCode}`, {
          status: lookup.notFound ? 404 : 400,
        });
      }

      const pngBuffer = await produceDigitalTicketPng(lookup.ticket);
      generatedTickets.push({ ticket_code: lookup.ticket.ticket_code, pngBuffer });
    }

    if (generatedTickets.length === 1) {
      const ticket = generatedTickets[0];
      return new Response(ticket.pngBuffer, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition": `attachment; filename="${buildDigitalTicketFilename(ticket.ticket_code)}"`,
          "cache-control": "no-store",
        },
      });
    }

    const zip = new JSZip();
    for (const ticket of generatedTickets) {
      zip.file(buildDigitalTicketFilename(ticket.ticket_code), ticket.pngBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="farecoh-tickets.zip"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado procesando la entrega.";
    return new Response(message, { status: 500 });
  }
};
