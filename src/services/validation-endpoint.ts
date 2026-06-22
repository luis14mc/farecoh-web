import { checkRateLimit } from "@/lib/rate-limit";
import { checkinRequestSchema, ticketOrderSchema } from "@/lib/validation";
import { getClientIp, sanitizeText } from "@/lib/security";

export function parseTicketOrderRequest(request: Request, body: unknown) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({ key: `order:${ip}`, limit: 8, windowMs: 60_000 });

  if (!limit.allowed) {
    throw new Error("Demasiadas solicitudes. Intente nuevamente en un minuto.");
  }

  const input = body as Record<string, unknown>;
  return ticketOrderSchema.parse({
    eventSlug: sanitizeText(input.eventSlug, 80),
    fullName: sanitizeText(input.fullName, 120),
    email: sanitizeText(input.email, 160),
    phone: sanitizeText(input.phone, 32),
    quantity: input.quantity,
  });
}

export function parseCheckinRequest(request: Request, body: unknown) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({ key: `checkin:${ip}`, limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    throw new Error("Demasiadas validaciones. Intente nuevamente en un minuto.");
  }

  const input = body as Record<string, unknown>;
  return checkinRequestSchema.parse({
    ticketCode: sanitizeText(input.ticketCode, 16),
    checkedBy: input.checkedBy,
    deviceInfo: sanitizeText(input.deviceInfo, 240),
  });
}