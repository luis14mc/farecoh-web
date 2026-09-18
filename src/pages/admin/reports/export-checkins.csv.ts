import type { APIRoute } from "astro";
import { queryRows } from "@/lib/db";
import { exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  try {
    const checkins = await queryRows<{
      ticket_code: string | null;
      buyer_name: string | null;
      validated_by: string | null;
      validated_at: string;
    }>(
      `SELECT t.ticket_code, t.buyer_name, c.validated_by, c.validated_at
       FROM checkins c
       LEFT JOIN tickets t ON c.ticket_id = t.id
       ORDER BY c.validated_at DESC;`
    );

    const rows = checkins.map((row) => [
      row.ticket_code ?? "",
      row.buyer_name ?? "",
      row.validated_by ?? "",
      row.validated_at,
    ]);

    return exportCsvResponse(context, "checkins.csv", [
      "ticket_code",
      "buyer_name",
      "validated_by",
      "validated_at",
    ], rows);
  } catch (error: any) {
    return new Response(error?.message || "Error al exportar registros de acceso", { status: 500 });
  }
};
