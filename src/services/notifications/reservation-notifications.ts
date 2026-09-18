import { query } from "../../lib/db.ts";
import { sanitizeText } from "../../lib/security.ts";
import { buildReservationNotificationMessage } from "./reservation-notification-message.ts";
import {
  getWhatsAppNotifyRecipient,
  isWhatsAppConfigured,
  readWhatsAppProviderConfig,
  sendWhatsAppMessage,
} from "./whatsapp.ts";

export type { ReservationNotificationMessageInput as ReservationNotificationInput } from "./reservation-notification-message.ts";
export { buildReservationNotificationMessage } from "./reservation-notification-message.ts";

interface ReservationNotificationRecord {
  ticketCodes: string[];
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  channel: string;
  recipient: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeText(error.message, 500);
  }

  return sanitizeText(String(error), 500);
}

async function persistNotificationRecord(record: ReservationNotificationRecord): Promise<void> {
  try {
    await query(
      `INSERT INTO reservation_notifications
        (ticket_codes, buyer_name, buyer_phone, buyer_email, channel, recipient, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        record.ticketCodes,
        record.buyerName,
        record.buyerPhone || null,
        record.buyerEmail || null,
        record.channel,
        record.recipient,
        record.status,
        record.errorMessage ?? null,
      ]
    );
  } catch (error: any) {
    console.error("[reservation-notification] Failed to persist notification log:", sanitizeText(error?.message || String(error), 240));
  }
}

/**
 * Sends staff WhatsApp alert for a new reservation.
 * Never throws — reservation flow must not depend on notification delivery.
 */
export async function notifyStaffOfNewReservation(input: {
  ticketCodes: string[];
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  eventTitle?: string;
}): Promise<void> {
  const baseRecord = {
    ticketCodes: input.ticketCodes,
    buyerName: sanitizeText(input.buyerName, 120),
    buyerPhone: sanitizeText(input.buyerPhone, 32),
    buyerEmail: sanitizeText(input.buyerEmail, 160),
    channel: "whatsapp",
    recipient: "",
  };

  try {
    if (!isWhatsAppConfigured()) {
      await persistNotificationRecord({
        ...baseRecord,
        recipient: "unconfigured",
        status: "skipped",
        errorMessage: "WhatsApp provider is not configured.",
      });
      return;
    }

    const config = readWhatsAppProviderConfig();
    if (!config) {
      await persistNotificationRecord({
        ...baseRecord,
        recipient: "unconfigured",
        status: "skipped",
        errorMessage: "WhatsApp provider is not configured.",
      });
      return;
    }

    const recipient = getWhatsAppNotifyRecipient(config);
    const body = buildReservationNotificationMessage(input);

    await sendWhatsAppMessage({ to: recipient, body });

    await persistNotificationRecord({
      ...baseRecord,
      recipient,
      status: "sent",
    });
  } catch (error) {
    const message = safeErrorMessage(error);
    console.error("[reservation-notification]", message);

    const config = readWhatsAppProviderConfig();
    const recipient = config ? getWhatsAppNotifyRecipient(config) : "unknown";

    await persistNotificationRecord({
      ...baseRecord,
      recipient,
      status: "failed",
      errorMessage: message,
    });
  }
}
