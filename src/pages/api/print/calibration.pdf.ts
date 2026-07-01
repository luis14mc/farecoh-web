import type { APIRoute } from "astro";
import { requireAdminAccess } from "@/lib/rbac";
import { buildTicketCalibrationPdf } from "@/lib/ticket-print";
import { sanitizeTicketPrintLayout } from "@/lib/ticket-print-layout-config";

function numberParam(url: URL, key: string): number | undefined {
  const value = url.searchParams.get(key);
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin/printing");
  if (!access.ok) {
    return new Response("No autorizado.", { status: 403 });
  }

  try {
    const layout = sanitizeTicketPrintLayout({
      qrCenterXPercent: numberParam(context.url, "qrCenterXPercent"),
      qrCenterYPercent: numberParam(context.url, "qrCenterYPercent"),
      codeCenterXPercent: numberParam(context.url, "codeCenterXPercent"),
      codeCenterYPercent: numberParam(context.url, "codeCenterYPercent"),
      updatedAt: null,
    });
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