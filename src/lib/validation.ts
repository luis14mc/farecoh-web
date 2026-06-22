import { z } from "zod";
import { PINK_FLOYD_EVENT_SLUG } from "@/types/events";
import { isTicketCode, normalizeTicketCode } from "@/services/ticket-code";

export const eventSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug del evento no es válido.");

export const ticketCodeSchema = z
  .string()
  .transform(normalizeTicketCode)
  .refine(isTicketCode, "El código de boleto debe tener formato PF-000001.");

export const ticketOrderSchema = z.object({
  eventSlug: eventSlugSchema.default(PINK_FLOYD_EVENT_SLUG),
  fullName: z.string().trim().min(3, "Ingrese el nombre completo.").max(120),
  email: z.string().trim().email("Ingrese un correo válido.").max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(8, "Ingrese un teléfono válido.").max(32),
  quantity: z.coerce.number().int().min(1).max(10),
});

export const checkinRequestSchema = z.object({
  ticketCode: ticketCodeSchema,
  checkedBy: z.string().uuid().optional().nullable(),
  deviceInfo: z.string().trim().max(240).optional().nullable(),
});

export type TicketOrderInput = z.infer<typeof ticketOrderSchema>;
export type CheckinRequestInput = z.infer<typeof checkinRequestSchema>;
