import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { readTicketLayoutConfig } from "@/lib/ticket-layout-config";
import { generateLayoutPreviewImage } from "@/lib/ticket-delivery";
import type { TicketLayoutType } from "@/lib/ticket-layouts/types";

const TEST_TICKET_CODE = "PF-000001";

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
    const message = error instanceof Error ? error.message : "No se pudo generar la vista previa.";
    return new Response(message, { status: 500 });
  }
};
