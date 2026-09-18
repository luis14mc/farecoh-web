import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { getDbPool, query } from "../src/lib/db.ts";

const TICKET_COUNT = 500;
const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://www.farecoh.org").replace(/\/$/, "");
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

await mkdir(QR_DIR, { recursive: true });
await mkdir(EXPORT_DIR, { recursive: true });

const res = await query<TicketRow>(`
  SELECT t.id, t.ticket_code as code, t.qr_token, t.status
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  WHERE e.slug = 'pink-floyd'
  ORDER BY t.ticket_code ASC;
`);

const data = res.rows;
if (!data) throw new Error("No tickets returned from database.");
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

  if (data.find((row) => row.id === ticket.id)?.qr_token !== ticket.qr_token) {
    await query(
      "UPDATE tickets SET qr_token = $1 WHERE id = $2;",
      [ticket.qr_token, ticket.id]
    );
  }

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

await getDbPool().end();

console.log(`Generated ${tickets.length} QR PNG files in ${QR_DIR}`);
console.log(`Exported CSV: ${CSV_PATH}`);