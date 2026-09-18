#!/usr/bin/env node
/**
 * Production verification for a single digital ticket.
 * Run: pnpm verify:digital-ticket PF-000016
 */
import { buildTicketQrUrl } from "../src/lib/ticket-image-compose.ts";
import { decodeDigitalTicketQrUrl } from "../src/lib/ticket-delivery-qr-decode.ts";
import {
  assertTicketIdentityUnchanged,
  identityReportToText,
  produceDigitalTicketPng,
  verifyDigitalTicketIdentity,
} from "../src/lib/ticket-delivery-verify.ts";
import { queryOne, getDbPool } from "../src/lib/db.ts";

const ticketCode = (process.argv[2] ?? "PF-000016").trim().toUpperCase();

const before = await queryOne<{
  id: string;
  ticket_code: string;
  qr_token: string;
  status: string;
}>(
  "SELECT id, ticket_code, qr_token, status FROM tickets WHERE ticket_code = $1 AND status IN ('sold', 'validated') LIMIT 1;",
  [ticketCode]
);

if (!before) {
  console.error(`Ticket ${ticketCode} not found or not deliverable.`);
  try {
    await getDbPool().end();
  } catch {}
  process.exit(1);
}

const originalCode = before.ticket_code;
const originalToken = before.qr_token;

try {
  const report = verifyDigitalTicketIdentity(ticketCode, before);
  console.log(identityReportToText(report));

  if (!report.ok) {
    try {
      await getDbPool().end();
    } catch {}
    process.exit(1);
  }

  const expectedQrUrl = buildTicketQrUrl(originalToken);
  const pngBuffer = await produceDigitalTicketPng(before, ticketCode);
  const decodedUrl = await decodeDigitalTicketQrUrl(pngBuffer);

  if (decodedUrl !== expectedQrUrl) {
    console.error("QR decode mismatch in development check.");
    console.error(`Expected: ${expectedQrUrl}`);
    console.error(`Decoded:  ${decodedUrl ?? "NONE"}`);
    try {
      await getDbPool().end();
    } catch {}
    process.exit(1);
  }

  const unchanged = await assertTicketIdentityUnchanged(before);
  if (!unchanged || originalToken !== before.qr_token || originalCode !== before.ticket_code) {
    console.error("Ticket identity changed after generation.");
    try {
      await getDbPool().end();
    } catch {}
    process.exit(1);
  }

  console.log("Identity and QR decode verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  try {
    await getDbPool().end();
  } catch {}
  process.exit(1);
}

try {
  await getDbPool().end();
} catch {}
