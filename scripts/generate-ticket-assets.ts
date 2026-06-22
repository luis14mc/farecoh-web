import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const TICKET_COUNT = 500;
const SITE_URL = requireEnv("PUBLIC_SITE_URL").replace(/\/$/, "");
const SUPABASE_URL = requireEnv("PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const QR_DIR = path.join(process.cwd(), "public", "generated-qr");
const EXPORT_DIR = path.join(process.cwd(), "exports");
const CSV_PATH = path.join(EXPORT_DIR, "tickets-print.csv");

interface TicketRow {
  id: string;
  code: string;
  qr_token: string | null;
  qr_url: string | null;
  status: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function createQrToken(code: string): string {
  return createHash("sha256").update(`farecoh:pink-floyd:${normalizeCode(code)}`).digest("hex");
}

function createQrUrl(qrToken: string): string {
  return `${SITE_URL}/t/${qrToken}`;
}

function csvEscape(value: string): string {
  if ([",", "\n", '"'].some((char) => value.includes(char))) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function validateUnique(rows: TicketRow[], field: "code" | "qr_token") {
  const values = rows.map((row) => row[field]).filter(Boolean);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    throw new Error(`Duplicate ${field} detected.`);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await mkdir(QR_DIR, { recursive: true });
await mkdir(EXPORT_DIR, { recursive: true });

const { data, error } = await supabase
  .from("tickets")
  .select("id, code, qr_token, qr_url, status")
  .eq("event_slug", "pink-floyd")
  .order("code", { ascending: true });

if (error) throw error;
if (!data) throw new Error("No tickets returned from Supabase.");
if (data.length !== TICKET_COUNT) throw new Error(`Expected ${TICKET_COUNT} tickets, received ${data.length}.`);

const tickets: TicketRow[] = data.map((ticket) => ({
  ...ticket,
  code: normalizeCode(ticket.code),
  qr_token: ticket.qr_token || createQrToken(ticket.code),
  qr_url: ticket.qr_url || createQrUrl(ticket.qr_token || createQrToken(ticket.code)),
}));

validateUnique(tickets, "code");
validateUnique(tickets, "qr_token");

for (const ticket of tickets) {
  if (!ticket.qr_token || !ticket.qr_url) throw new Error(`${ticket.code} is missing QR data.`);

  if (data.find((row) => row.id === ticket.id)?.qr_token !== ticket.qr_token || data.find((row) => row.id === ticket.id)?.qr_url !== ticket.qr_url) {
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ qr_token: ticket.qr_token, qr_url: ticket.qr_url })
      .eq("id", ticket.id);
    if (updateError) throw updateError;
  }

  const qrImageRelative = `/generated-qr/${ticket.code}.png`;
  const qrImagePath = path.join(QR_DIR, `${ticket.code}.png`);
  await QRCode.toFile(qrImagePath, ticket.qr_url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

const csvRows = [
  ["code", "qr_token", "qr_url", "qr_image", "status"],
  ...tickets.map((ticket) => [
    ticket.code,
    ticket.qr_token || "",
    ticket.qr_url || "",
    `/generated-qr/${ticket.code}.png`,
    ticket.status,
  ]),
];

await writeFile(CSV_PATH, `${csvRows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`, "utf8");

console.log(`Generated ${tickets.length} QR PNG files in ${QR_DIR}`);
console.log(`Exported CSV: ${CSV_PATH}`);