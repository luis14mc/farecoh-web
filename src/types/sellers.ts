export type SellerType = "vendor" | "physical_point";

export interface Seller {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: SellerType;
  active: boolean;
  created_at: string;
}

export interface SellerInput {
  name: string;
  phone: string;
  email: string;
  type: SellerType;
}

export interface SellerReportRow {
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  salesCount: number;
  ticketsSold: number;
  revenue: number;
}

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  vendor: "Vendedor",
  physical_point: "Punto físico",
};
