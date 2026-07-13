import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { buildTicketCalibrationPdf } from "@/lib/ticket-print";
import { readTicketLayoutConfig } from "@/lib/ticket-layout-config";
import { sanitizeTicketLayoutConfig } from "@/lib/ticket-image-compose";
import { restorePhysicalTicketLayout } from "@/lib/ticket-layouts/physical-ticket-layout";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  try {
    const { config: saved } = await readTicketLayoutConfig("physical");
    const defaults = restorePhysicalTicketLayout();

    const layout = sanitizeTicketLayoutConfig(
      {
        templateWidth: saved.templateWidth,
        templateHeight: saved.templateHeight,
        codeFontSize: Number(context.url.searchParams.get("codeFontSize")) || saved.codeFontSize,
        codeBoxes: saved.codeBoxes.map((box, index) => ({
          x: Number(context.url.searchParams.get(`code${index}X`)) || box.x,
          y: Number(context.url.searchParams.get(`code${index}Y`)) || box.y,
          width: Number(context.url.searchParams.get(`code${index}W`)) || box.width,
          height: Number(context.url.searchParams.get(`code${index}H`)) || box.height,
        })),
        qrBoxes: saved.qrBoxes.map((box, index) => ({
          x: Number(context.url.searchParams.get(`qr${index}X`)) || box.x,
          y: Number(context.url.searchParams.get(`qr${index}Y`)) || box.y,
          width: Number(context.url.searchParams.get(`qr${index}W`)) || box.width,
          height: Number(context.url.searchParams.get(`qr${index}H`)) || box.height,
        })),
      },
      defaults,
    );

    const pdfBytes = await buildTicketCalibrationPdf(layout);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="farecoh-ticket-calibration.pdf"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF de calibración.";
    return new Response(message, { status: 400 });
  }
};
