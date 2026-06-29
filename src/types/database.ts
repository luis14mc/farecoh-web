export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EventStatus = "draft" | "active" | "sold_out" | "completed" | "cancelled";
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type TicketStatus = "available" | "assigned" | "reserved" | "paid" | "sold" | "validated" | "cancelled" | "pending";
export type AdminRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";
export type StaffRole = AdminRole;
export type SellerType = "vendor" | "physical_point";
export type BatchStatus = "active" | "closed" | "cancelled";

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
          event_id: string | null;
          order_id: string | null;
          customer_id: string | null;
          batch_id: string | null;
          event_slug: string;
          ticket_code: string;
          status: TicketStatus;
          qr_token: string | null;
          qr_url: string | null;
          buyer_name: string | null;
          buyer_phone: string | null;
          buyer_email: string | null;
          seller_id: string | null;
          seller_name: string | null;
          sale_location: string | null;
          payment_method: string | null;
          payment_reference: string | null;
          payment_amount: number | null;
          issued_at: string;
          sold_at: string | null;
          validated_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ticket_code: string;
          status?: TicketStatus;
          event_id?: string | null;
          order_id?: string | null;
          customer_id?: string | null;
          batch_id?: string | null;
          event_slug?: string;
          qr_token?: string | null;
          qr_url?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          buyer_email?: string | null;
          seller_id?: string | null;
          seller_name?: string | null;
          sale_location?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
          payment_amount?: number | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Row"]>;
      };
      sellers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string;
          type: SellerType;
          active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          phone: string;
          email: string;
          type: SellerType;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["sellers"]["Row"]>;
      };
      ticket_batches: {
        Row: {
          id: string;
          name: string;
          start_code: string;
          end_code: string;
          total_tickets: number;
          assigned_seller_id: string | null;
          location: string | null;
          status: BatchStatus;
          created_at: string;
        };
        Insert: {
          name: string;
          start_code: string;
          end_code: string;
          total_tickets: number;
          assigned_seller_id?: string | null;
          location?: string | null;
          status?: BatchStatus;
        };
        Update: Partial<Database["public"]["Tables"]["ticket_batches"]["Row"]>;
      };
      sales: {
        Row: {
          id: string;
          ticket_id: string;
          amount: number;
          payment_method: string;
          seller_name: string;
          sales_point: string;
          created_at: string;
        };
        Insert: {
          ticket_id: string;
          amount: number;
          payment_method: string;
          seller_name: string;
          sales_point: string;
        };
        Update: Partial<Database["public"]["Tables"]["sales"]["Row"]>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          full_name: string;
          role_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          email: string;
          full_name: string;
          role_id: string;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      checkins: {
        Row: {
          id: string;
          ticket_id: string;
          validated_by: string;
          validated_at: string;
        };
        Insert: {
          ticket_id: string;
          validated_by: string;
        };
        Update: never;
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          entity: string;
          entity_id: string;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          action: string;
          entity: string;
          entity_id: string;
          performed_by: string;
        };
        Update: never;
      };
    };
    Functions: {
      get_auth_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
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
      assign_ticket_range: {
        Args: { p_start_code: string; p_end_code: string; p_seller_id: string; p_location: string };
        Returns: number;
      };
      sell_physical_ticket: {
        Args: {
          p_code: string;
          p_buyer_name: string;
          p_buyer_phone: string;
          p_buyer_email: string;
          p_seller_id: string;
          p_sale_location: string;
          p_payment_method: string;
          p_payment_reference?: string | null;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      validate_physical_ticket: {
        Args: { p_code: string };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      get_public_ticket_status: {
        Args: { p_qr_token: string };
        Returns: { ticket_code: string; status: string; event_slug: string }[];
      };
    };
  };
}
