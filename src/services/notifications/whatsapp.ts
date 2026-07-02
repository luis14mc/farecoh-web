import { sanitizeText } from "../../lib/security.ts";

export type WhatsAppProviderName = "twilio" | "meta";

export interface SendWhatsAppMessageInput {
  to: string;
  body: string;
}

export interface SendWhatsAppMessageResult {
  provider: WhatsAppProviderName;
  messageId?: string;
}

export interface WhatsAppProviderConfig {
  provider: WhatsAppProviderName;
  twilio?: {
    accountSid: string;
    authToken: string;
    from: string;
  };
  meta?: {
    accessToken: string;
    phoneNumberId: string;
    from: string;
  };
}

function readServerEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env[name]) {
    return process.env[name];
  }

  if (typeof import.meta !== "undefined") {
    const value = import.meta.env?.[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function normalizeWhatsAppAddress(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("whatsapp:")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return trimmed;
  }

  return `whatsapp:+${digits}`;
}

export function readWhatsAppProviderConfig(): WhatsAppProviderConfig | null {
  const providerRaw = (readServerEnv("WHATSAPP_PROVIDER") ?? "twilio").trim().toLowerCase();
  const provider: WhatsAppProviderName = providerRaw === "meta" ? "meta" : "twilio";
  const notifyTo = readServerEnv("FARECOH_NOTIFY_WHATSAPP_TO");

  if (!notifyTo) {
    return null;
  }

  if (provider === "meta") {
    const accessToken = readServerEnv("META_WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = readServerEnv("META_WHATSAPP_PHONE_NUMBER_ID");
    const from = readServerEnv("META_WHATSAPP_FROM") ?? notifyTo;

    if (!accessToken || !phoneNumberId) {
      return null;
    }

    return {
      provider,
      meta: {
        accessToken,
        phoneNumberId,
        from: normalizeWhatsAppAddress(from),
      },
    };
  }

  const accountSid = readServerEnv("TWILIO_ACCOUNT_SID");
  const authToken = readServerEnv("TWILIO_AUTH_TOKEN");
  const from = readServerEnv("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !from) {
    return null;
  }

  return {
    provider: "twilio",
    twilio: {
      accountSid,
      authToken,
      from: normalizeWhatsAppAddress(from),
    },
  };
}

export function getWhatsAppNotifyRecipient(config: WhatsAppProviderConfig): string {
  const raw = readServerEnv("FARECOH_NOTIFY_WHATSAPP_TO") ?? "";
  return normalizeWhatsAppAddress(raw);
}

function stripWhatsAppPrefix(value: string): string {
  return value.replace(/^whatsapp:/i, "").replace(/\D/g, "");
}

async function sendViaTwilio(
  config: NonNullable<WhatsAppProviderConfig["twilio"]>,
  input: SendWhatsAppMessageInput,
): Promise<SendWhatsAppMessageResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  const body = new URLSearchParams({
    From: config.from,
    To: normalizeWhatsAppAddress(input.to),
    Body: input.body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json()) as { sid?: string; message?: string; code?: number };

  if (!response.ok) {
    const detail = sanitizeText(payload.message ?? `Twilio HTTP ${response.status}`, 240);
    throw new Error(detail || "Twilio WhatsApp request failed.");
  }

  return {
    provider: "twilio",
    messageId: payload.sid,
  };
}

async function sendViaMeta(
  config: NonNullable<WhatsAppProviderConfig["meta"]>,
  input: SendWhatsAppMessageInput,
): Promise<SendWhatsAppMessageResult> {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(config.phoneNumberId)}/messages`;
  const to = stripWhatsAppPrefix(input.to);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: input.body },
    }),
  });

  const payload = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };

  if (!response.ok) {
    const detail = sanitizeText(payload.error?.message ?? `Meta WhatsApp HTTP ${response.status}`, 240);
    throw new Error(detail || "Meta WhatsApp request failed.");
  }

  return {
    provider: "meta",
    messageId: payload.messages?.[0]?.id,
  };
}

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
  const config = readWhatsAppProviderConfig();
  if (!config) {
    throw new Error("WhatsApp provider is not configured.");
  }

  const sanitizedBody = sanitizeText(input.body, 4096);
  const to = normalizeWhatsAppAddress(input.to);

  if (config.provider === "meta" && config.meta) {
    return sendViaMeta(config.meta, { to, body: sanitizedBody });
  }

  if (!config.twilio) {
    throw new Error("Twilio WhatsApp credentials are missing.");
  }

  return sendViaTwilio(config.twilio, { to, body: sanitizedBody });
}

export function isWhatsAppConfigured(): boolean {
  return readWhatsAppProviderConfig() !== null;
}
