import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { generateDigitalTicketImage } from "@/lib/ticket-delivery";
import { buildDigitalTicketFilename } from "@/lib/ticket-layouts/digital-ticket-layout";
import JSZip from "jszip";

export const POST: APIRoute = async (context) => {
  // Check authorization for /admin/delivery
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

    // Fetch tickets and enforce status check server-side
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("ticket_code, qr_token, status")
      .in("ticket_code", ticketCodes);

    if (ticketsError || !tickets) {
      return new Response("Error al cargar los boletos de la base de datos.", { status: 500 });
    }

    // Filter to only allow sold or validated tickets
    const validTickets = tickets.filter(
      (t) => t.status === "sold" || t.status === "validated"
    );

    if (validTickets.length === 0) {
      return new Response("Ninguno de los boletos indicados tiene estado 'sold' o 'validated'.", { status: 400 });
    }

    // Single ticket request
    if (validTickets.length === 1) {
      const ticket = validTickets[0];
      const pngBuffer = await generateDigitalTicketImage(ticket.ticket_code, ticket.qr_token);
      const filename = buildDigitalTicketFilename(ticket.ticket_code);

      return new Response(pngBuffer, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "no-store",
        },
      });
    }

    // Multiple tickets -> package in ZIP
    const zip = new JSZip();

    for (const ticket of validTickets) {
      const pngBuffer = await generateDigitalTicketImage(ticket.ticket_code, ticket.qr_token);
      zip.file(buildDigitalTicketFilename(ticket.ticket_code), pngBuffer);
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
