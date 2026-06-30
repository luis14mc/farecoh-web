import type { APIRoute } from "astro";
import { createSupabaseServerClient, exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);

  const { data: tickets = [], error } = await supabase
    .from("tickets")
    .select(
      "ticket_code, status, buyer_name, buyer_phone, buyer_email, seller_name, sale_location, payment_method, payment_reference, sold_at, validated_at",
    )
    .order("ticket_code", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

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
};
