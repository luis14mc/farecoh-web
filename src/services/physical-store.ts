import type { PhysicalTicket, TicketBatch } from "@/types/ticketing";
import type { Seller, SellerInput } from "@/types/sellers";
import { formatSiteDateTime } from "@/lib/locale";

export const TICKETS_KEY = "farecoh_physical_tickets_v1";
export const BATCHES_KEY = "farecoh_ticket_batches_v1";
export const SELLERS_KEY = "farecoh_sellers_v1";

const DEFAULT_SELLERS: Seller[] = [
  {
    id: "seller-001",
    name: "María López",
    phone: "+504 9999-0001",
    email: "maria@farecoh.org",
    type: "vendor",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "seller-002",
    name: "Escuela Nacional de Música",
    phone: "+504 2234-5678",
    email: "ventas@enm.hn",
    type: "physical_point",
    active: true,
    created_at: new Date().toISOString(),
  },
];

export function formatTicketCode(number: number): string {
  return `PF-${String(number).padStart(6, "0")}`;
}

export function normalizeTicketCode(value: string): string {
  return String(value || "").trim().toUpperCase();
}

export function isTicketCode(value: string): boolean {
  return /^PF-\d{6}$/.test(normalizeTicketCode(value));
}

export function parseTicketCode(value: string): number | null {
  const match = normalizeTicketCode(value).match(/^PF-(\d{6})$/);
  return match ? Number(match[1]) : null;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTickets(): PhysicalTicket[] {
  return readJson<PhysicalTicket[]>(TICKETS_KEY, []);
}

export function setTickets(tickets: PhysicalTicket[]): void {
  writeJson(TICKETS_KEY, tickets);
}

export function getBatches(): TicketBatch[] {
  return readJson<TicketBatch[]>(BATCHES_KEY, []);
}

export function setBatches(batches: TicketBatch[]): void {
  writeJson(BATCHES_KEY, batches);
}

export function getSellers(): Seller[] {
  return readJson<Seller[]>(SELLERS_KEY, []);
}

export function setSellers(sellers: Seller[]): void {
  writeJson(SELLERS_KEY, sellers);
}

export function getActiveSellers(): Seller[] {
  return getSellers().filter((seller) => seller.active);
}

export function getSellerById(id: string): Seller | undefined {
  return getSellers().find((seller) => seller.id === id);
}

export function getSellerName(id: string | null | undefined): string {
  if (!id) return "-";
  return getSellerById(id)?.name ?? "-";
}

export function seedSellers(force = false): void {
  if (!force && localStorage.getItem(SELLERS_KEY)) return;
  writeJson(SELLERS_KEY, DEFAULT_SELLERS);
}

export function seedPhysicalTicketing(force = false): void {
  seedSellers(force);

  if (!force && localStorage.getItem(TICKETS_KEY) && localStorage.getItem(BATCHES_KEY)) {
    migrateLegacyTickets();
    return;
  }

  const now = new Date().toISOString();
  const batch: TicketBatch = {
    id: "batch-general-001",
    name: "LOTE GENERAL 001",
    start_code: "PF-000001",
    end_code: "PF-000500",
    total_tickets: 500,
    assigned_seller_id: null,
    location: null,
    status: "active",
    created_at: now,
  };

  const tickets: PhysicalTicket[] = Array.from({ length: 500 }, (_, index) => ({
    id: `ticket-${String(index + 1).padStart(6, "0")}`,
    batch_id: batch.id,
    event_slug: "pink-floyd",
    code: formatTicketCode(index + 1),
    status: "available",
    buyer_name: null,
    buyer_phone: null,
    buyer_email: null,
    seller_id: null,
    seller_name: null,
    sale_location: null,
    payment_method: null,
    payment_reference: null,
    sold_at: null,
    validated_at: null,
    notes: null,
    created_at: now,
  }));

  writeJson(BATCHES_KEY, [batch]);
  writeJson(TICKETS_KEY, tickets);
}

function migrateLegacyTickets(): void {
  const tickets = getTickets();
  if (!tickets.length) return;

  let changed = false;
  const sellers = getSellers();
  const sellerByName = new Map(sellers.map((seller) => [seller.name.toLowerCase(), seller.id]));

  const nextTickets = tickets.map((ticket) => {
    const legacy = ticket as PhysicalTicket & { seller_id?: string | null };
    if (legacy.seller_id !== undefined) return ticket;

    changed = true;
    const sellerId = ticket.seller_name
      ? sellerByName.get(ticket.seller_name.toLowerCase()) ?? null
      : null;

    return { ...ticket, seller_id: sellerId };
  });

  if (changed) setTickets(nextTickets);

  const batches = getBatches();
  const nextBatches = batches.map((batch) => {
    const legacy = batch as TicketBatch & { assigned_seller_id?: string | null; assigned_to?: string | null };
    if (legacy.assigned_seller_id !== undefined) return batch;

    const assignedTo = legacy.assigned_to;
    const assignedSellerId = assignedTo
      ? sellerByName.get(String(assignedTo).toLowerCase()) ?? null
      : null;

    return { ...batch, assigned_seller_id: assignedSellerId };
  });

  if (nextBatches.some((batch, index) => batch !== batches[index])) {
    setBatches(nextBatches);
  }
}

export function createSeller(input: SellerInput): Seller {
  const seller: Seller = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    type: input.type,
    active: true,
    created_at: new Date().toISOString(),
  };

  setSellers([...getSellers(), seller]);
  return seller;
}

export function updateSeller(id: string, input: SellerInput): Seller | null {
  const sellers = getSellers();
  const index = sellers.findIndex((seller) => seller.id === id);
  if (index === -1) return null;

  const updated: Seller = {
    ...sellers[index],
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    type: input.type,
  };

  sellers[index] = updated;
  setSellers(sellers);
  return updated;
}

export function deactivateSeller(id: string): Seller | null {
  const sellers = getSellers();
  const index = sellers.findIndex((seller) => seller.id === id);
  if (index === -1) return null;

  sellers[index] = { ...sellers[index], active: false };
  setSellers(sellers);
  return sellers[index];
}

export function activateSeller(id: string): Seller | null {
  const sellers = getSellers();
  const index = sellers.findIndex((seller) => seller.id === id);
  if (index === -1) return null;

  sellers[index] = { ...sellers[index], active: true };
  setSellers(sellers);
  return sellers[index];
}

export const PHYSICAL_STATUS_LABELS: Record<PhysicalTicket["status"], string> = {
  available: "Disponible",
  assigned: "Asignado",
  reserved: "Reservado",
  paid: "Pagado",
  validated: "Validado",
  cancelled: "Anulado",
};

export function formatPhysicalDate(value: string | null): string {
  if (!value) return "-";
  return formatSiteDateTime(value, { dateStyle: "medium", timeStyle: "short" });
}
