import type { AdminRole } from "./database";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminReportMetrics {
  ticketsSold: number;
  ticketsPending: number;
  ticketsValidated: number;
  grossRevenue: number;
  remainingCapacity: number;
  checkinRate: number;
}