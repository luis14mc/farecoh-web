export type PhysicalTicketStatus = "available" | "assigned" | "reserved" | "paid" | "sold" | "validated" | "cancelled" | "pending";

export interface TicketBatch {
  id: string;
  name: string;
  start_code: string;
  end_code: string;
  total_tickets: number;
  assigned_seller_id: string | null;
  location: string | null;
  status: "active" | "closed" | "cancelled";
  created_at: string;
}

export interface PhysicalTicket {
  id: string;
  batch_id: string | null;
  event_slug: string;
  ticket_code: string;
  status: PhysicalTicketStatus;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  seller_id: string | null;
  seller_name: string | null;
  sale_location: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  sold_at: string | null;
  validated_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PhysicalSaleInput {
  ticket_code: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  seller_id: string;
  sale_location: string;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export interface TicketBatchAssignmentInput {
  start_code: string;
  end_code: string;
  seller_id: string;
  location: string;
}

export interface TicketOperationResult {
  ok: boolean;
  message: string;
  ticket?: PhysicalTicket;
}
