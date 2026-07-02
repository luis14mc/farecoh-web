import type { AdminReportMetrics } from "../types/admin";
import { SITE_TIMEZONE } from "../lib/locale.ts";

export interface TicketLikeForReports {
  status: string;
  validated_at?: string | null;
}

export function isSoldTicketStatus(status: string): boolean {
  return status === "sold" || status === "validated";
}

export function countTicketsSold(tickets: TicketLikeForReports[]): number {
  return (tickets ?? []).filter((ticket) => isSoldTicketStatus(ticket.status)).length;
}

export function countTicketsByStatus(tickets: Array<{ status: string }>, status: string): number {
  return (tickets ?? []).filter((ticket) => ticket.status === status).length;
}

export function calculateAdminReportMetrics(params: {
  capacity: number;
  ticketPrice: number;
  tickets: TicketLikeForReports[];
}): AdminReportMetrics {
  const ticketsSold = countTicketsSold(params.tickets);
  const ticketsPending = params.tickets.filter((ticket) => ticket.status === "reserved").length;
  const ticketsValidated = params.tickets.filter(
    (ticket) => ticket.status === "validated" || Boolean(ticket.validated_at),
  ).length;
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

export function resolveGrossRevenue(params: {
  salesAmounts: Array<number | string>;
  ticketsSold: number;
  ticketPrice: number;
}): number {
  const fromSales = params.salesAmounts.reduce((sum, amount) => sum + Number(amount), 0);
  if (fromSales > 0) return fromSales;
  return params.ticketsSold * params.ticketPrice;
}

export function countSalesOnDate(
  sales: Array<{ created_at: string }>,
  referenceDate: Date = new Date(),
): number {
  const target = formatSalesDayKey(referenceDate);
  return sales.filter((sale) => formatSalesDayKey(sale.created_at) === target).length;
}

export function countTicketsSoldOnDate(
  tickets: Array<{ sold_at?: string | null; status: string }>,
  referenceDate: Date = new Date(),
): number {
  const target = formatSalesDayKey(referenceDate);
  return tickets.filter(
    (ticket) =>
      isSoldTicketStatus(ticket.status) &&
      ticket.sold_at &&
      formatSalesDayKey(ticket.sold_at) === target,
  ).length;
}

function formatSalesDayKey(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
