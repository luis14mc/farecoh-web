#!/usr/bin/env node
/**
 * Production verification for a single digital ticket.
 * Run: pnpm verify:digital-ticket PF-000016
 */
import { createClient } from "@supabase/supabase-js";
import { buildTicketQrUrl } from "../src/lib/ticket-image-compose.ts";
import { decodeDigitalTicketQrUrl } from "../src/lib/ticket-delivery-qr-decode.ts";
import {
  assertTicketIdentityUnchanged,
  identityReportToText,
  produceDigitalTicketPng,
  verifyDigitalTicketIdentity,
} from "../src/lib/ticket-delivery-verify.ts";

const ticketCode = (process.argv[2] ?? "PF-000016").trim().toUpperCase();
const url = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: before, error } = await supabase
  .from("tickets")
  .select("id, ticket_code, qr_token, status")
  .eq("ticket_code", ticketCode)
  .in("status", ["sold", "validated"])
  .single();

if (error || !before) {
  console.error(`Ticket ${ticketCode} not found or not deliverable.`, error?.message);
  process.exit(1);
}

const originalCode = before.ticket_code;
const originalToken = before.qr_token;

try {
  const report = verifyDigitalTicketIdentity(ticketCode, before);
  console.log(identityReportToText(report));

  if (!report.ok) process.exit(1);

  const expectedQrUrl = buildTicketQrUrl(originalToken);
  const pngBuffer = await produceDigitalTicketPng(before);
  const decodedUrl = await decodeDigitalTicketQrUrl(pngBuffer);

  if (decodedUrl !== expectedQrUrl) {
    console.error("QR decode mismatch in development check.");
    console.error(`Expected: ${expectedQrUrl}`);
    console.error(`Decoded:  ${decodedUrl ?? "NONE"}`);
    process.exit(1);
  }

  const unchanged = await assertTicketIdentityUnchanged(supabase, before);
  if (!unchanged || originalToken !== before.qr_token || originalCode !== before.ticket_code) {
    console.error("Ticket identity changed after generation.");
    process.exit(1);
  }

  console.log("Identity and QR decode verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
