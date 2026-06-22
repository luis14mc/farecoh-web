export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  ticket_price: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export type TicketStatus = "pending" | "paid" | "validated" | "cancelled";

export interface Order {
  id: string;
  customer_id: string;
  event_id: string;
  ticket_count: number;
  total_amount: number;
  status: TicketStatus;
  created_at: string;
  customer?: Customer;
}

export interface Ticket {
  id: string;
  order_id: string;
  event_id: string;
  ticket_code: string;
  status: TicketStatus;
  checked_in_at: string | null;
  created_at: string;
  order?: Order;
  customer?: Customer;
}
export function generateTicketCode(number: number): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error("Ticket number must be a positive integer.");
  }

  return `PF-${String(number).padStart(6, "0")}`;
}

export function parseTicketNumber(code: string): number | null {
  const match = normalizeTicketCode(code).match(/^PF-(\d{6})$/);
  return match ? Number(match[1]) : null;
}

export function normalizeTicketCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidTicketCode(code: string): boolean {
  return /^PF-\d{6}$/.test(normalizeTicketCode(code));
}