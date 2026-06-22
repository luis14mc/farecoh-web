import type { PhysicalTicket } from "@/types/ticketing";
import type { Seller, SellerReportRow } from "@/types/sellers";
import { compareSiteText } from "@/lib/locale";

export function calculateSellerReports(params: {
  tickets: PhysicalTicket[];
  sellers: Seller[];
  ticketPrice: number;
}): SellerReportRow[] {
  const { tickets, sellers, ticketPrice } = params;
  const soldStatuses = new Set<PhysicalTicket["status"]>(["paid", "validated"]);

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

  for (const ticket of tickets) {
    if (!ticket.seller_id || !soldStatuses.has(ticket.status)) continue;

    const current = rows.get(ticket.seller_id) ?? {
      sellerId: ticket.seller_id,
      sellerName: ticket.seller_name || "Vendedor desconocido",
      sellerType: "vendor" as const,
      salesCount: 0,
      ticketsSold: 0,
      revenue: 0,
    };

    current.salesCount += 1;
    current.ticketsSold += 1;
    current.revenue += ticketPrice;
    rows.set(ticket.seller_id, current);
  }

  return Array.from(rows.values())
    .filter((row) => row.ticketsSold > 0 || sellers.some((seller) => seller.id === row.sellerId))
    .sort((a, b) => b.revenue - a.revenue || compareSiteText(a.sellerName, b.sellerName));
}
