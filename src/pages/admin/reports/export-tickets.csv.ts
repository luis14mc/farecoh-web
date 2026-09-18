import type { APIRoute } from "astro";
import { queryRows } from "@/lib/db";
import { exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  try {
    const tickets = await queryRows<{
      ticket_code: string;
      status: string;
      buyer_name: string | null;
      buyer_phone: string | null;
      buyer_email: string | null;
      seller_name: string | null;
      sale_location: string | null;
      payment_method: string | null;
      payment_reference: string | null;
      sold_at: string | null;
      validated_at: string | null;
    }>(
      `SELECT ticket_code, status, buyer_name, buyer_phone, buyer_email, seller_name, sale_location, payment_method, payment_reference, sold_at, validated_at
       FROM tickets
       ORDER BY ticket_code ASC;`
    );

    const rows = tickets.map((ticket) => [
      ticket.ticket_code,
      ticket.status,
      ticket.buyer_name,
      ticket.buyer_phone,
      ticket.buyer_email,
      ticket.seller_name,
      ticket.sale_location,
      ticket.payment_method,
      ticket.payment_reference,
      ticket.sold_at,
      ticket.validated_at,
    ]);

    return exportCsvResponse(context, "tickets.csv", [
      "ticket_code",
      "status",
      "buyer_name",
      "buyer_phone",
      "buyer_email",
      "seller_name",
      "sale_location",
      "payment_method",
      "payment_reference",
      "sold_at",
      "validated_at",
    ], rows);
  } catch (error: any) {
    return new Response(error?.message || "Error al exportar boletos", { status: 500 });
  }
};
