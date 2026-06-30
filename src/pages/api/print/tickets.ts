import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { requireAdminAccess } from "@/lib/rbac";
import {
  buildPrintPdfFilename,
  buildTicketPrintPdf,
  loadPinkFloydPrintTickets,
  parsePrintRange,
} from "@/lib/ticket-print";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const fromRaw = context.url.searchParams.get("from") ?? "";
  const toRaw = context.url.searchParams.get("to") ?? "";

  try {
    const { from, to } = parsePrintRange(fromRaw, toRaw);
    const supabase = createSupabaseServerClient(context);
    const tickets = await loadPinkFloydPrintTickets(supabase, from, to);
    const pdfBytes = await buildTicketPrintPdf(tickets);
    const filename = buildPrintPdfFilename(from, to);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
    const status = message.includes("No autorizado") ? 403 : 400;
    return new Response(message, { status });
  }
};
