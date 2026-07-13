import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import {
  jsonLayoutError,
  jsonLayoutSuccess,
  resolveLayoutTypeParam,
} from "@/lib/ticket-layout-api";
import {
  canEditTicketLayouts,
  readTicketLayoutState,
  saveTicketLayoutConfig,
} from "@/lib/ticket-layout-config";
import { restoreDigitalTicketLayout } from "@/lib/ticket-layouts/digital-ticket-layout";
import { restorePhysicalTicketLayout } from "@/lib/ticket-layouts/physical-ticket-layout";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return jsonLayoutError(new Error("No autorizado."), 403);
  }

  const layoutType = resolveLayoutTypeParam(context.params);
  if (!layoutType) {
    return jsonLayoutError(new Error("layoutType must be 'physical' or 'digital'."), 400);
  }

  try {
    const state = await readTicketLayoutState(layoutType);
    return jsonLayoutSuccess({
      ...state,
      canEdit: canEditTicketLayouts(access.profile),
    });
  } catch (error) {
    return jsonLayoutError(error);
  }
};

export const POST: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return jsonLayoutError(new Error("No autorizado."), 403);
  }

  if (!canEditTicketLayouts(access.profile)) {
    return jsonLayoutError(new Error("Solo super_admin y event_manager pueden modificar la calibración."), 403);
  }

  const layoutType = resolveLayoutTypeParam(context.params);
  if (!layoutType) {
    return jsonLayoutError(new Error("layoutType must be 'physical' or 'digital'."), 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonLayoutError(new Error("Invalid JSON body."), 400);
  }

  try {
    const updatedBy = access.profile?.email ?? access.profile?.full_name ?? "admin";
    await saveTicketLayoutConfig(layoutType, body, updatedBy);
    const state = await readTicketLayoutState(layoutType);

    return jsonLayoutSuccess({
      ...state,
      canEdit: true,
    });
  } catch (error) {
    return jsonLayoutError(error, 500);
  }
};

export const DELETE: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return jsonLayoutError(new Error("No autorizado."), 403);
  }

  if (!canEditTicketLayouts(access.profile)) {
    return jsonLayoutError(new Error("Solo super_admin y event_manager pueden restaurar la calibración."), 403);
  }

  const layoutType = resolveLayoutTypeParam(context.params);
  if (!layoutType) {
    return jsonLayoutError(new Error("layoutType must be 'physical' or 'digital'."), 400);
  }

  const defaults =
    layoutType === "physical" ? restorePhysicalTicketLayout() : restoreDigitalTicketLayout();
  const updatedBy = access.profile?.email ?? access.profile?.full_name ?? "admin";

  try {
    await saveTicketLayoutConfig(layoutType, defaults, updatedBy);
    const state = await readTicketLayoutState(layoutType);
    return jsonLayoutSuccess(state);
  } catch (error) {
    return jsonLayoutError(error, 500);
  }
};
