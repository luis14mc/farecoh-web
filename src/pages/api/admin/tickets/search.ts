import type { APIRoute } from "astro";
import { queryOne } from "@/lib/db";
import { requireAdminAccess } from "@/lib/rbac";
import { normalizeTicketCode } from "@/services/ticket-code";

export const GET: APIRoute = async (context) => {
  const access = await requireAdminAccess(context, "/admin");
  if (!access.ok) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const url = new URL(context.request.url);
  const codeParam = url.searchParams.get("code")?.trim();
  const tokenParam = url.searchParams.get("token")?.trim();

  if (!codeParam && !tokenParam) {
    return Response.json({ ok: false, error: "Indique código o token." }, { status: 400 });
  }

  try {
    let ticket;
    if (codeParam) {
      const cleanCode = normalizeTicketCode(codeParam);
      ticket = await queryOne(
        `SELECT id, ticket_code, qr_token, status, buyer_name, buyer_phone, buyer_email,
                seller_id, seller_name, sale_location, payment_method, payment_reference,
                sold_at, validated_at, reserved_at, created_at, batch_id
         FROM tickets
         WHERE ticket_code = $1
         LIMIT 1;`,
        [cleanCode]
      );
    } else if (tokenParam) {
      ticket = await queryOne(
        `SELECT id, ticket_code, qr_token, status, buyer_name, buyer_phone, buyer_email,
                seller_id, seller_name, sale_location, payment_method, payment_reference,
                sold_at, validated_at, reserved_at, created_at, batch_id
         FROM tickets
         WHERE qr_token = $1
         LIMIT 1;`,
        [tokenParam]
      );
    }

    if (!ticket) {
      return Response.json({ ok: false, error: "Boleto inexistente." }, { status: 404 });
    }

    return Response.json({ ok: true, data: ticket });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "Error al buscar boleto." }, { status: 500 });
  }
};
