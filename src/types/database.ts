export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EventStatus = "draft" | "active" | "sold_out" | "completed" | "cancelled";
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type TicketStatus = "pending" | "paid" | "validated" | "cancelled";
export type AdminRole = "super_admin" | "event_manager" | "checkin_operator";

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          location: string;
          city: string;
          event_date: string;
          event_time: string;
          ticket_price: number;
          capacity: number;
          status: EventStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          location: string;
          event_date: string;
          event_time: string;
          ticket_price: number;
          capacity: number;
          description?: string | null;
          city?: string;
          status?: EventStatus;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      customers: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string;
          created_at: string;
        };
        Insert: { full_name: string; phone: string; email?: string | null };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      };
      orders: {
        Row: {
          id: string;
          event_id: string;
          customer_id: string;
          total_amount: number;
          quantity: number;
          payment_reference: string | null;
          payment_method: string | null;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          customer_id: string;
          total_amount: number;
          quantity: number;
          payment_reference?: string | null;
          payment_method?: string | null;
          status?: OrderStatus;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          order_id: string;
          customer_id: string;
          ticket_code: string;
          status: TicketStatus;
          qr_token: string;
          ticket_url: string | null;
          issued_at: string;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          order_id: string;
          customer_id: string;
          status?: TicketStatus;
          ticket_code?: string;
          qr_token?: string;
          ticket_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Row"]>;
      };
      checkins: {
        Row: {
          id: string;
          ticket_id: string;
          checked_by: string | null;
          checked_at: string;
          device_info: string | null;
        };
        Insert: { ticket_id: string; checked_by?: string | null; device_info?: string | null };
        Update: never;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
      admins: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: AdminRole;
          created_at: string;
        };
        Insert: { id: string; email: string; name: string; role?: AdminRole };
        Update: Partial<Database["public"]["Tables"]["admins"]["Row"]>;
      };
    };
    Functions: {
      create_ticket_order: {
        Args: {
          p_event_slug: string;
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_quantity: number;
        };
        Returns: { order_id: string; customer_id: string; ticket_codes: string[]; total_amount: number }[];
      };
      mark_order_paid: {
        Args: { p_order_id: string; p_payment_reference: string; p_payment_method: string; p_user_id?: string | null };
        Returns: undefined;
      };
      validate_ticket: {
        Args: { p_ticket_code: string; p_checked_by?: string | null; p_device_info?: string | null };
        Returns: {
          ok: boolean;
          message: string;
          ticket_id: string | null;
          ticket_code: string;
          status: TicketStatus | null;
          validated_at: string | null;
        }[];
      };
    };
  };
}