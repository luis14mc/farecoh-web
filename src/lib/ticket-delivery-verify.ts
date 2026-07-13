import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketQrUrl } from "./ticket-image-compose.ts";
import { generateDigitalTicketImage } from "./ticket-delivery.ts";
import { assertTicketIdentity, hashQrToken } from "./ticket-delivery-identity.ts";
import type { DeliverableTicket } from "./ticket-delivery-access.ts";
import {
  assertStoredQrToken,
  resolveProductionTicketCode,
} from "./ticket-delivery-production.ts";
import { normalizeTicketCode } from "../services/ticket-code.ts";

export interface DigitalTicketIdentityReport {
  ok: boolean;
  requestedTicket: string;
  ticketCode: string;
  status: string;
  qrSource: "stored-token";
  qrUrlMatchesStoredToken: boolean;
  qrTokenHash: string;
  message: string;
}

export function verifyDigitalTicketIdentity(
  requestedTicketCode: string,
  ticket: DeliverableTicket,
): DigitalTicketIdentityReport {
  const requested = normalizeTicketCode(requestedTicketCode);
  const storedCode = normalizeTicketCode(ticket.ticket_code);
  const token = ticket.qr_token?.trim() ?? "";

  if (!token) {
    return {
      ok: false,
      requestedTicket: requested,
      ticketCode: storedCode,
      status: ticket.status,
      qrSource: "stored-token",
      qrUrlMatchesStoredToken: false,
      qrTokenHash: "",
      message: "El boleto no tiene qr_token almacenado.",
    };
  }

  if (requested !== storedCode) {
    return {
      ok: false,
      requestedTicket: requested,
      ticketCode: storedCode,
      status: ticket.status,
      qrSource: "stored-token",
      qrUrlMatchesStoredToken: false,
      qrTokenHash: hashQrToken(token),
      message: "El código solicitado no coincide con el boleto en la base de datos.",
    };
  }

  assertTicketIdentity(requested, ticket);
  const expectedQrUrl = buildTicketQrUrl(token);

  return {
    ok: true,
    requestedTicket: requested,
    ticketCode: storedCode,
    status: ticket.status,
    qrSource: "stored-token",
    qrUrlMatchesStoredToken: expectedQrUrl === buildTicketQrUrl(token),
    qrTokenHash: hashQrToken(token),
    message: "Identidad del boleto verificada.",
  };
}

export async function assertTicketIdentityUnchanged(
  supabase: SupabaseClient,
  ticket: DeliverableTicket,
): Promise<boolean> {
  const { data: after } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token")
    .eq("id", ticket.id)
    .single();

  return (
    Boolean(after) &&
    after.ticket_code === ticket.ticket_code &&
    after.qr_token === ticket.qr_token
  );
}

export async function produceDigitalTicketPng(
  ticket: DeliverableTicket,
  requestedTicketCode?: string,
): Promise<Buffer> {
  assertStoredQrToken(ticket);

  const renderedTicketCode = requestedTicketCode
    ? resolveProductionTicketCode(ticket, requestedTicketCode)
    : resolveProductionTicketCode(ticket, ticket.ticket_code);

  assertTicketIdentity(renderedTicketCode, ticket);

  return generateDigitalTicketImage(ticket.ticket_code, ticket.qr_token, {
    requestedTicketCode,
  });
}

export function identityReportToText(report: DigitalTicketIdentityReport): string {
  return [
    `Requested ticket: ${report.requestedTicket}`,
    `Stored ticket: ${report.ticketCode}`,
    `Status: ${report.status}`,
    `QR source: ${report.qrSource}`,
    `QR URL matches stored token: ${report.qrUrlMatchesStoredToken ? "YES" : "NO"}`,
    `QR token hash: ${report.qrTokenHash || "NONE"}`,
  ].join("\n");
}

export function stablePreviewQrToken(ticketCode: string): string {
  return createHash("sha256").update(`calibration-preview:${ticketCode}`).digest("hex");
}
