import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import { generateTicketImage } from "@/lib/ticket-delivery";

export const GET: APIRoute = async (context) => {
  // Check authorization for /admin/delivery
  const access = await requireAdminAccess(context, "/admin/delivery");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const { code } = context.params;
  if (!code) {
    return new Response("Código de boleto no especificado.", { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient(context);

    // Fetch the ticket from Supabase and enforce status check
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("ticket_code, qr_token, status")
      .eq("ticket_code", code.toUpperCase())
      .single();

    if (ticketError || !ticket) {
      return new Response("Boleto no encontrado.", { status: 404 });
    }

    if (ticket.status !== "sold" && ticket.status !== "validated") {
      return new Response("El boleto debe estar vendido o validado para generar su imagen digital.", { status: 400 });
    }

    const pngBuffer = await generateTicketImage(ticket.ticket_code, ticket.qr_token);
    const filename = `farecoh-${ticket.ticket_code}.png`;
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
    const message = error instanceof Error ? error.message : "Error inesperado generando la imagen del boleto.";
    return new Response(message, { status: 500 });
  }
};
