import type { APIRoute } from "astro";
import QRCode from "qrcode";
import { buildCanvaTicketUrl } from "@/lib/canva-export";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params }) => {
  const token = (params.token ?? "").trim().toLowerCase();
  if (!UUID_PATTERN.test(token)) {
    return new Response("QR token inválido.", { status: 400 });
  }

  try {
    const targetUrl = buildCanvaTicketUrl(token);
    const png = await QRCode.toBuffer(targetUrl, {
      type: "png",
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No se pudo generar el QR.", { status: 500 });
  }
};
