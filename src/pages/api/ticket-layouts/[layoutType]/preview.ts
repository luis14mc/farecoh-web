import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { jsonLayoutError, resolveLayoutTypeParam } from "@/lib/ticket-layout-api";
import { readTicketLayoutConfig } from "@/lib/ticket-layout-config";
import { generateLayoutPreviewImage } from "@/lib/ticket-delivery";

const TEST_TICKET_CODE = "PF-000001";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  const layoutType = resolveLayoutTypeParam(context.params);
  if (!layoutType) {
    return jsonLayoutError(new Error("layoutType must be 'physical' or 'digital'."), 400);
  }

  try {
    await readTicketLayoutConfig(layoutType);
    const ticketCode = context.url.searchParams.get("ticketCode")?.toUpperCase() ?? TEST_TICKET_CODE;
    const pngBuffer = await generateLayoutPreviewImage(layoutType, ticketCode);
    const filename = `farecoh-${layoutType}-preview-${ticketCode}.png`;

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonLayoutError(error);
  }
};
