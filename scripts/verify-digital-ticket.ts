#!/usr/bin/env node
/**
 * Production verification for a single digital ticket.
 * Run: pnpm verify:digital-ticket PF-000016
 */
import { createClient } from "@supabase/supabase-js";
import {
  produceVerifiedDigitalTicketPng,
  verificationReportToText,
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
  const { report } = await produceVerifiedDigitalTicketPng(supabase, ticketCode, before);
  console.log(verificationReportToText(report));

  const { data: after } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token")
    .eq("id", before.id)
    .single();

  if (!report.ok) process.exit(1);
  if (after?.qr_token !== originalToken || after?.ticket_code !== originalCode) {
    console.error("Ticket identity changed after verification.");
    process.exit(1);
  }

  console.log("Verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
