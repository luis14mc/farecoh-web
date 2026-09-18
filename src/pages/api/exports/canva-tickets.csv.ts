import type { APIRoute } from "astro";
import {
  buildCanvaTicketsCsv,
  CANVA_TICKETS_FILENAME,
  loadPinkFloydCanvaTicketRows,
} from "@/lib/canva-export";
import { requireAdminAccess } from "@/lib/rbac";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/reports");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  try {
    const rows = await loadPinkFloydCanvaTicketRows();
    const csv = buildCanvaTicketsCsv(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${CANVA_TICKETS_FILENAME}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo exportar el CSV.";
    return new Response(message, { status: 500 });
  }
};
