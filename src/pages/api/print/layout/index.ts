import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import {
  readTicketPrintLayoutState,
  sanitizeTicketPrintLayout,
  saveTicketPrintLayout,
} from "@/lib/ticket-print-layout-config";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const state = await readTicketPrintLayoutState();
  return Response.json(state, {
    headers: { "cache-control": "no-store" },
  });
};

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  try {
    const payload = await context.request.json();
    const layout = sanitizeTicketPrintLayout(payload);
    const saved = await saveTicketPrintLayout(layout);
    const state = await readTicketPrintLayoutState();

    return Response.json({ ...state, layout: saved }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la calibración.";
    return new Response(message, { status: 400 });
  }
};