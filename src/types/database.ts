export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TicketStatus =
  | "available"
  | "assigned"
  | "reserved"
  | "sold"
  | "validated"
  | "cancelled";
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
          event_date: string;
          event_time: string;
          location: string;
          city: string | null;
          ticket_price: number;
          capacity: number;
          status: string;
          created_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          event_date: string;
          event_time: string;
          location: string;
          ticket_price: number;
          capacity: number;
          description?: string | null;
          city?: string | null;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          batch_id: string | null;
          ticket_code: string;
          qr_token: string;
          status: TicketStatus;
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
          reserved_at: string | null;
          created_at: string;
        };
        Insert: {
          event_id: string;
          ticket_code: string;
          status?: TicketStatus;
          batch_id?: string | null;
          qr_token?: string;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          buyer_email?: string | null;
          seller_id?: string | null;
          seller_name?: string | null;
          sale_location?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Row"]>;
      };
      sellers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          type: SellerType;
          active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          type: SellerType;
          phone?: string | null;
          email?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["sellers"]["Row"]>;
      };
      ticket_batches: {
        Row: {
          id: string;
          event_id: string;
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
          event_id: string;
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
          seller_id: string | null;
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
          seller_id?: string | null;
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
          entity_id: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          action: string;
          entity: string;
          performed_by: string;
          entity_id?: string | null;
        };
        Update: never;
      };
      reservation_notifications: {
        Row: {
          id: string;
          ticket_codes: string[];
          buyer_name: string;
          buyer_phone: string | null;
          buyer_email: string | null;
          channel: string;
          recipient: string;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          ticket_codes: string[];
          buyer_name: string;
          buyer_phone?: string | null;
          buyer_email?: string | null;
          channel?: string;
          recipient: string;
          status: string;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reservation_notifications"]["Row"]>;
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
      create_initial_ticket_inventory: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_ticket_order: {
        Args: {
          p_event_slug: string;
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_quantity: number;
        };
        Returns: {
          order_id: string;
          ticket_codes: string[];
          total_amount: number;
          reservation_status: TicketStatus;
        }[];
      };
      validate_ticket: {
        Args: { p_ticket_code: string; p_validated_by: string };
        Returns: {
          ok: boolean;
          message: string;
          ticket_id: string | null;
          ticket_code: string;
          status: TicketStatus | null;
          validated_at: string | null;
        }[];
      };
      confirm_ticket_payment: {
        Args: {
          p_ticket_code: string;
          p_payment_method: string;
          p_payment_reference: string;
          p_seller_id: string;
          p_sale_location: string;
          p_confirmed_by: string;
          p_buyer_name?: string | null;
          p_buyer_phone?: string | null;
          p_buyer_email?: string | null;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      cancel_ticket_reservation: {
        Args: {
          p_ticket_code: string;
          p_cancelled_by: string;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      sell_physical_ticket: {
        Args: {
          p_ticket_code: string;
          p_buyer_name: string;
          p_buyer_phone: string;
          p_buyer_email: string;
          p_seller_id: string;
          p_sale_location: string;
          p_payment_method: string;
          p_payment_reference?: string | null;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      get_public_ticket_status: {
        Args: { p_qr_token: string };
        Returns: { ticket_code: string; status: string; event_slug: string }[];
      };
      validate_ticket_by_qr: {
        Args: { p_qr_token: string; p_validated_by: string };
        Returns: {
          ok: boolean;
          message: string;
          ticket_code: string;
          status: string;
          validated_at: string | null;
        }[];
      };
    };
  };
}
