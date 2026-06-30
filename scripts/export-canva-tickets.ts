import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCanvaQrImageUrl, buildCanvaTicketUrl } from "../src/lib/canva-export.ts";

const EXPORT_DIR = path.join(process.cwd(), "exports");
const EXPORT_PATH = path.join(EXPORT_DIR, "canva-tickets-pink-floyd.csv");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function csvEscape(value: string): string {
  if ([",", "\n", '"'].some((char) => value.includes(char))) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

const SUPABASE_URL = requireEnv("PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: event, error: eventError } = await supabase
  .from("events")
  .select("id")
  .eq("slug", "pink-floyd")
  .single();

if (eventError || !event) {
  throw new Error(`Pink Floyd event not found: ${eventError?.message ?? "missing row"}`);
}

const { data: tickets = [], error: ticketsError } = await supabase
  .from("tickets")
  .select("ticket_code, qr_token, status")
  .eq("event_id", event.id)
  .order("ticket_code", { ascending: true });

if (ticketsError) {
  throw new Error(`Failed to load tickets: ${ticketsError.message}`);
}

if (!tickets.length) {
  throw new Error("No tickets found for pink-floyd event.");
}

const rows = tickets.map((ticket) => ({
  ticket_code: ticket.ticket_code,
  qr_url: buildCanvaTicketUrl(ticket.qr_token),
  qr_image: buildCanvaQrImageUrl(ticket.qr_token),
  status: ticket.status,
}));

await mkdir(EXPORT_DIR, { recursive: true });

const header = ["ticket_code", "qr_url", "qr_image", "status"];
const csv = [
  header,
  ...rows.map((row) => [row.ticket_code, row.qr_url, row.qr_image, row.status]),
]
  .map((row) => row.map(csvEscape).join(","))
  .join("\n");

await writeFile(EXPORT_PATH, `${csv}\n`, "utf8");

console.log(`Exported ${rows.length} Canva rows to ${EXPORT_PATH}`);
