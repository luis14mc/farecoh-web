import type { TicketStatus } from "@/types/database";

export function canValidateTicket(status: TicketStatus): boolean {
  return status === "paid";
}

export function getValidationDenialReason(status: TicketStatus): string | null {
  if (status === "pending") return "Boleto pendiente de pago";
  if (status === "validated") return "Boleto ya validado";
  if (status === "cancelled") return "Boleto cancelado";
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