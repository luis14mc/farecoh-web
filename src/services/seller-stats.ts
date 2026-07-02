import type { Seller, SellerReportRow } from "../types/sellers";
import { compareSiteText } from "../lib/locale.ts";

export interface TicketLikeForSellerReport {
  seller_id: string | null;
  seller_name: string | null;
  status: string;
}

export interface SaleLikeForSellerReport {
  seller_id: string | null;
  seller_name: string;
  amount: number | string;
}

function sellerRowKey(sellerId: string | null, sellerName: string): string {
  return sellerId ?? `name:${sellerName}`;
}

function ensureSellerRow(
  rows: Map<string, SellerReportRow>,
  sellers: Seller[],
  sellerId: string | null,
  sellerName: string,
): SellerReportRow {
  const key = sellerRowKey(sellerId, sellerName);
  const existing = rows.get(key);
  if (existing) return existing;

  const registeredSeller = sellerId ? sellers.find((seller) => seller.id === sellerId) : undefined;
  const row: SellerReportRow = {
    sellerId: sellerId ?? key,
    sellerName: (registeredSeller?.name ?? sellerName) || "Vendedor desconocido",
    sellerType: registeredSeller?.type ?? "vendor",
    salesCount: 0,
    ticketsSold: 0,
    revenue: 0,
  };
  rows.set(key, row);
  return row;
}

export function calculateSellerReports(params: {
  tickets: TicketLikeForSellerReport[];
  sales?: SaleLikeForSellerReport[];
  sellers: Seller[];
  ticketPrice: number;
}): SellerReportRow[] {
  const { tickets, sales = [], sellers, ticketPrice } = params;
  const soldStatuses = new Set(["sold", "validated"]);
  const rows = new Map<string, SellerReportRow>();

  for (const seller of sellers) {
    rows.set(seller.id, {
      sellerId: seller.id,
      sellerName: seller.name,
      sellerType: seller.type,
      salesCount: 0,
      ticketsSold: 0,
      revenue: 0,
    });
  }

  if (sales.length > 0) {
    for (const sale of sales) {
      const sellerName = sale.seller_name?.trim() || "Vendedor desconocido";
      const current = ensureSellerRow(rows, sellers, sale.seller_id, sellerName);
      current.salesCount += 1;
      current.ticketsSold += 1;
      current.revenue += Number(sale.amount);
    }
  } else {
    for (const ticket of tickets) {
      if (!ticket.seller_id || !soldStatuses.has(ticket.status)) continue;

      const current = ensureSellerRow(
        rows,
        sellers,
        ticket.seller_id,
        ticket.seller_name || "Vendedor desconocido",
      );

      current.salesCount += 1;
      current.ticketsSold += 1;
      current.revenue += ticketPrice;
    }
  }

  return Array.from(rows.values())
    .filter((row) => row.ticketsSold > 0 || sellers.some((seller) => seller.id === row.sellerId))
    .sort((a, b) => b.revenue - a.revenue || compareSiteText(a.sellerName, b.sellerName));
}
