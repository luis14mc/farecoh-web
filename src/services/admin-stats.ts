import type { AdminReportMetrics } from "../types/admin";

export interface TicketLikeForReports {
  status: string;
  total_amount?: number;
  validated_at?: string | null;
  checked_in_at?: string | null;
}

export function calculateAdminReportMetrics(params: {
  capacity: number;
  ticketPrice: number;
  tickets: TicketLikeForReports[];
}): AdminReportMetrics {
  const ticketsSold = params.tickets.filter((ticket) => ticket.status === "paid" || ticket.status === "validated").length;
  const ticketsPending = params.tickets.filter((ticket) => ticket.status === "pending").length;
  const ticketsValidated = params.tickets.filter((ticket) => ticket.status === "validated" || Boolean(ticket.validated_at) || Boolean(ticket.checked_in_at)).length;
  const grossRevenue = ticketsSold * params.ticketPrice;
  const remainingCapacity = Math.max(params.capacity - ticketsSold - ticketsPending, 0);
  const checkinRate = ticketsSold > 0 ? Math.round((ticketsValidated / ticketsSold) * 100) : 0;

  return {
    ticketsSold,
    ticketsPending,
    ticketsValidated,
    grossRevenue,
    remainingCapacity,
    checkinRate,
  };
}