import type { APIRoute } from "astro";
import { queryRows } from "@/lib/db";
import { exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  try {
    const sales = await queryRows<{
      ticket_code: string | null;
      amount: number | string;
      payment_method: string | null;
      seller_name: string | null;
      sales_point: string | null;
      created_at: string;
    }>(
      `SELECT t.ticket_code, s.amount, s.payment_method, s.seller_name, s.sales_point, s.created_at
       FROM sales s
       LEFT JOIN tickets t ON s.ticket_id = t.id
       ORDER BY s.created_at DESC;`
    );

    const rows = sales.map((sale) => [
      sale.ticket_code ?? "",
      sale.amount,
      sale.payment_method,
      sale.seller_name,
      sale.sales_point,
      sale.created_at,
    ]);

    return exportCsvResponse(context, "sales.csv", [
      "ticket_code",
      "amount",
      "payment_method",
      "seller_name",
      "sales_point",
      "created_at",
    ], rows);
  } catch (error: any) {
    return new Response(error?.message || "Error al exportar ventas", { status: 500 });
  }
};
