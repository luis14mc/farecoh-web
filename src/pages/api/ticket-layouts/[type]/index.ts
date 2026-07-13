import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import {
  canEditTicketLayouts,
  readTicketLayoutState,
  saveTicketLayoutConfig,
} from "@/lib/ticket-layout-config";
import type { TicketLayoutType } from "@/lib/ticket-layouts/types";
import { restoreDigitalTicketLayout } from "@/lib/ticket-layouts/digital-ticket-layout";
import { restorePhysicalTicketLayout } from "@/lib/ticket-layouts/physical-ticket-layout";

function parseLayoutType(raw: string | undefined): TicketLayoutType | null {
  if (raw === "physical" || raw === "digital") return raw;
  return null;
}

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const layoutType = parseLayoutType(context.params.type);
  if (!layoutType) {
    return new Response("Tipo de layout inválido.", { status: 400 });
  }

  try {
    const state = await readTicketLayoutState(layoutType);
    return Response.json(
      {
        ...state,
        canEdit: canEditTicketLayouts(access.profile),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la calibración.";
    return new Response(message, { status: 500 });
  }
};

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  if (!canEditTicketLayouts(access.profile)) {
    return new Response("Solo super_admin y event_manager pueden modificar la calibración.", {
      status: 403,
    });
  }

  const layoutType = parseLayoutType(context.params.type);
  if (!layoutType) {
    return new Response("Tipo de layout inválido.", { status: 400 });
  }

  try {
    const payload = await context.request.json();
    const config = payload?.config ?? payload;
    const updatedBy = access.profile?.email ?? access.profile?.full_name ?? "admin";
    const saved = await saveTicketLayoutConfig(layoutType, config, updatedBy);
    const state = await readTicketLayoutState(layoutType);

    return Response.json(
      {
        ...state,
        config: saved.config,
        canEdit: true,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la calibración.";
    return new Response(message, { status: 400 });
  }
};

export const DELETE: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  if (!canEditTicketLayouts(access.profile)) {
    return new Response("Solo super_admin y event_manager pueden restaurar la calibración.", {
      status: 403,
    });
  }

  const layoutType = parseLayoutType(context.params.type);
  if (!layoutType) {
    return new Response("Tipo de layout inválido.", { status: 400 });
  }

  const defaults =
    layoutType === "physical" ? restorePhysicalTicketLayout() : restoreDigitalTicketLayout();
  const updatedBy = access.profile?.email ?? access.profile?.full_name ?? "admin";

  try {
    await saveTicketLayoutConfig(layoutType, defaults, updatedBy);
    const state = await readTicketLayoutState(layoutType);
    return Response.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo restaurar la calibración.";
    return new Response(message, { status: 400 });
  }
};
