import type { PhysicalTicketStatus } from "@/types/ticketing";

export const TICKET_STATUSES: PhysicalTicketStatus[] = [
  "available",
  "assigned",
  "reserved",
  "sold",
  "validated",
  "cancelled",
];

export const TICKET_STATUS_LABELS: Record<PhysicalTicketStatus, string> = {
  available: "Disponible",
  assigned: "Asignado",
  reserved: "Reservado",
  sold: "Vendido",
  validated: "Validado",
  cancelled: "Anulado",
};

export const TICKET_STATUS_CLASSES: Record<PhysicalTicketStatus, string> = {
  available: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  sold: "bg-green-100 text-green-700",
  validated: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

export function getTicketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status as PhysicalTicketStatus] ?? status;
}

export function getTicketActionLabel(status: string): string {
  switch (status) {
    case "reserved":
      return "Confirmar pago";
    case "available":
    case "assigned":
      return "Registrar venta";
    case "sold":
      return "Listo para check-in";
    case "validated":
      return "Ya ingresó";
    case "cancelled":
      return "Anulado";
    default:
      return "-";
  }
}

export function canConfirmPayment(status: string): boolean {
  return status === "available" || status === "assigned" || status === "reserved";
}
