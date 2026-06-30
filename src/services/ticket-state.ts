import type { TicketStatus } from "../types/database";

export function canValidateTicket(status: TicketStatus): boolean {
  return status === "sold";
}

export function getValidationDenialReason(status: TicketStatus): string | null {
  if (status === "reserved") return "Boleto reservado, pago no confirmado";
  if (status === "available" || status === "assigned") return "Boleto no vendido";
  if (status === "validated") return "Boleto ya utilizado";
  if (status === "cancelled") return "Boleto anulado";
  return null;
}

export function transitionTicketToValidated(status: TicketStatus): TicketStatus {
  if (!canValidateTicket(status)) {
    throw new Error(getValidationDenialReason(status) ?? "El boleto no puede validarse");
  }

  return "validated";
}

export const canCheckInTicket = canValidateTicket;
export const getCheckinDenialReason = getValidationDenialReason;
export const transitionTicketToCheckedIn = transitionTicketToValidated;
