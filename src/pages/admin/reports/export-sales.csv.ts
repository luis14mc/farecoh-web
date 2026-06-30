import type { APIRoute } from "astro";
import { createSupabaseServerClient, exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);

  const { data: sales = [], error } = await supabase
    .from("sales")
    .select("amount, payment_method, seller_name, sales_point, created_at, ticket:tickets(ticket_code)")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = sales.map((sale) => {
    const ticket = sale.ticket as { ticket_code?: string } | null;
    return [
      ticket?.ticket_code ?? "",
      sale.amount,
      sale.payment_method,
      sale.seller_name,
      sale.sales_point,
      sale.created_at,
    ];
  });

  return exportCsvResponse(context, "sales.csv", [
    "ticket_code",
    "amount",
    "payment_method",
    "seller_name",
    "sales_point",
    "created_at",
  ], rows);
};
