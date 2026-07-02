import type { APIRoute } from "astro";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, sanitizeText } from "@/lib/security";
import { ticketOrderSchema } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { createTicketOrder } from "@/services/orders";
import { notifyStaffOfNewReservation } from "@/services/notifications/reservation-notifications";

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `reserve:${ip}`, limit: 10, windowMs: 15 * 60_000 });

  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intente más tarde." }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Solicitud inválida." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = ticketOrderSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos de reservación inválidos.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const order = await createTicketOrder(supabase, parsed.data);

    void notifyStaffOfNewReservation({
      ticketCodes: order.ticketCodes,
      buyerName: parsed.data.fullName,
      buyerPhone: parsed.data.phone,
      buyerEmail: parsed.data.email ?? "",
    });

    return new Response(
      JSON.stringify({
        orderId: order.orderId,
        ticketCodes: order.ticketCodes,
        totalAmount: order.totalAmount,
        status: order.status,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    const message = sanitizeText(error instanceof Error ? error.message : "No se pudo crear la reservación.", 240);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
};
