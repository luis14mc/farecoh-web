import type { APIRoute } from "astro";
import { canAccessRoute } from "@/lib/rbac";
import { createSupabaseServerClient } from "@/lib/auth";
import {
  buildCanvaExportRows,
  CANVA_EXPORT_HEADERS,
  filterTicketsInRange,
  formatCanvaExportFilename,
} from "@/lib/canva-export";
import { toCsv } from "@/lib/csv";
import { isTicketCode, normalizeTicketCode } from "@/services/ticket-code";

export const GET: APIRoute = async (context) => {
  const profile = context.locals.staffProfile;
  if (!profile || !canAccessRoute(profile.role, "/admin/printing")) {
    return new Response("No autorizado.", { status: 403 });
  }

  const eventId = context.url.searchParams.get("event_id")?.trim();
  const batchId = context.url.searchParams.get("batch_id")?.trim() || null;
  const startCode = normalizeTicketCode(context.url.searchParams.get("start_code") ?? "");
  const endCode = normalizeTicketCode(context.url.searchParams.get("end_code") ?? "");

  if (!eventId) {
    return new Response("Seleccione un evento.", { status: 400 });
  }

  if (!isTicketCode(startCode) || !isTicketCode(endCode)) {
    return new Response("Rango de boletos inválido. Use PF-000001.", { status: 400 });
  }

  const supabase = createSupabaseServerClient(context);

  if (batchId) {
    const { data: batch, error: batchError } = await supabase
      .from("ticket_batches")
      .select("id, event_id, start_code, end_code, name")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return new Response("Lote no encontrado.", { status: 404 });
    }

    if (batch.event_id !== eventId) {
      return new Response("El lote no pertenece al evento seleccionado.", { status: 400 });
    }

    const startSeq = Number(startCode.split("-")[1]);
    const endSeq = Number(endCode.split("-")[1]);
    const batchStart = Number(batch.start_code.split("-")[1]);
    const batchEnd = Number(batch.end_code.split("-")[1]);

    if (startSeq < batchStart || endSeq > batchEnd) {
      return new Response("El rango debe estar dentro del lote seleccionado.", { status: 400 });
    }
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug, name")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return new Response("Evento no encontrado.", { status: 404 });
  }

  const { data: tickets = [], error: ticketsError } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token, status, batch_id, batch:ticket_batches(name)")
    .eq("event_id", eventId)
    .order("ticket_code", { ascending: true });

  if (ticketsError) {
    return new Response(ticketsError.message, { status: 500 });
  }

  const filtered = filterTicketsInRange(tickets, startCode, endCode, batchId);
  if (!filtered.length) {
    return new Response("No hay boletos en el rango seleccionado.", { status: 404 });
  }

  const rows = buildCanvaExportRows(
    filtered.map((ticket) => ({
      ticket_code: ticket.ticket_code,
      qr_token: ticket.qr_token,
      status: ticket.status,
      event_name: event.name,
      batch_name: (ticket.batch as { name?: string } | null)?.name ?? null,
    })),
  );

  const filename = formatCanvaExportFilename(event.slug, startCode, endCode);
  const csv = `\uFEFF${toCsv([Array.from(CANVA_EXPORT_HEADERS), ...rows])}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
};
