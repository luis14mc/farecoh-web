import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TICKET_COUNT = 500;
const BATCH_NAME = "LOTE GENERAL 001";
const EXPORT_DIR = path.join(process.cwd(), "exports");
const EXPORT_PATH = path.join(EXPORT_DIR, "canva-tickets-pink-floyd.csv");
const PUBLIC_SITE_URL = requirePublicSiteUrl();

interface CanvaTicketRow {
  code: string;
  qr_token: string;
  qr_url: string;
  status: "available";
  batch_name: string;
  assigned_to: string;
}

function requirePublicSiteUrl(): string {
  const value = process.env.PUBLIC_SITE_URL;
  if (!value) {
    throw new Error("PUBLIC_SITE_URL is required. Example: PUBLIC_SITE_URL=https://farecoh.org pnpm run export:canva-tickets");
  }

  return value.replace(/\/$/, "");
}

function generateTicketCode(number: number): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error("Ticket number must be a positive integer.");
  }

  return `PF-${String(number).padStart(6, "0")}`;
}

function createQrToken(code: string): string {
  return createHash("sha256").update(`farecoh:pink-floyd:${code}`).digest("hex");
}

function csvEscape(value: string): string {
  if ([",", "\n", '"'].some((char) => value.includes(char))) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

const rows: CanvaTicketRow[] = Array.from({ length: TICKET_COUNT }, (_, index) => {
  const code = generateTicketCode(index + 1);
  const qrToken = createQrToken(code);

  return {
    code,
    qr_token: qrToken,
    qr_url: `${PUBLIC_SITE_URL}/t/${qrToken}`,
    status: "available",
    batch_name: BATCH_NAME,
    assigned_to: "",
  };
});

const uniqueCodes = new Set(rows.map((row) => row.code));
const uniqueTokens = new Set(rows.map((row) => row.qr_token));
const uniqueUrls = new Set(rows.map((row) => row.qr_url));

if (uniqueCodes.size !== TICKET_COUNT) throw new Error("Duplicate ticket code detected.");
if (uniqueTokens.size !== TICKET_COUNT) throw new Error("Duplicate qr_token detected.");
if (uniqueUrls.size !== TICKET_COUNT) throw new Error("Duplicate qr_url detected.");

await mkdir(EXPORT_DIR, { recursive: true });

const header = ["code", "qr_url", "status", "batch_name", "assigned_to"];
const csv = [
  header,
  ...rows.map((row) => [row.code, row.qr_url, row.status, row.batch_name, row.assigned_to]),
]
  .map((row) => row.map(csvEscape).join(","))
  .join("\n");

await writeFile(EXPORT_PATH, `${csv}\n`, "utf8");

console.log(`Exported ${rows.length} Canva rows to ${EXPORT_PATH}`);
console.log(`Unique codes: ${uniqueCodes.size}`);
console.log(`Unique qr_tokens: ${uniqueTokens.size}`);
console.log(`Public site URL: ${PUBLIC_SITE_URL}`);