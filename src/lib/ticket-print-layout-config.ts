import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TicketPrintLayout, TicketPrintLayoutState, TicketTemplateDimensions } from "../types/ticket-print-layout.ts";
import { loadTicketTemplateBytes } from "./ticket-print-template.ts";

export const DEFAULT_TICKET_PRINT_LAYOUT: TicketPrintLayout = {
  qrCenterXPercent: 0.859,
  qrCenterYPercent: 0.729,
  codeCenterXPercent: 0.855,
  codeCenterYPercent: 0.4825,
  updatedAt: null,
};

export const TICKET_LAYOUT_FILENAME = "ticket_layout.json";
export const TICKET_LAYOUT_PATH = path.join(process.cwd(), TICKET_LAYOUT_FILENAME);
const TICKET_LAYOUT_BUCKET = "app-config";

async function getPersistentStorage() {
  const { supabaseAdmin } = await import("./supabase.ts");
  return supabaseAdmin?.storage ?? null;
}

async function ensureConfigBucket(): Promise<NonNullable<Awaited<ReturnType<typeof getPersistentStorage>>>> {
  const storage = await getPersistentStorage();
  if (!storage) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY es necesaria para guardar la calibración en producción.");
  }

  const { data: buckets, error: listError } = await storage.listBuckets();
  if (listError) throw listError;

  if (!buckets.some((bucket) => bucket.name === TICKET_LAYOUT_BUCKET)) {
    const { error: createError } = await storage.createBucket(TICKET_LAYOUT_BUCKET, { public: false });
    if (createError && !createError.message.toLowerCase().includes("already exists")) throw createError;
  }

  return storage;
}

function clampPercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function sanitizeTicketPrintLayout(value: unknown): TicketPrintLayout {
  const candidate = value && typeof value === "object" ? (value as Partial<TicketPrintLayout>) : {};

  return {
    qrCenterXPercent: clampPercent(candidate.qrCenterXPercent, DEFAULT_TICKET_PRINT_LAYOUT.qrCenterXPercent),
    qrCenterYPercent: clampPercent(candidate.qrCenterYPercent, DEFAULT_TICKET_PRINT_LAYOUT.qrCenterYPercent),
    codeCenterXPercent: clampPercent(candidate.codeCenterXPercent, DEFAULT_TICKET_PRINT_LAYOUT.codeCenterXPercent),
    codeCenterYPercent: clampPercent(candidate.codeCenterYPercent, DEFAULT_TICKET_PRINT_LAYOUT.codeCenterYPercent),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
}

export async function readTicketPrintLayout(): Promise<TicketPrintLayout> {
  try {
    const storage = await getPersistentStorage();
    if (storage) {
      const { data, error } = await storage.from(TICKET_LAYOUT_BUCKET).download(TICKET_LAYOUT_FILENAME);
      if (!error && data) return sanitizeTicketPrintLayout(JSON.parse(await data.text()));
    }
  } catch (error) {
    console.warn("No se pudo leer la calibración desde Supabase Storage.", error);
  }

  try {
    const raw = await readFile(TICKET_LAYOUT_PATH, "utf8");
    return sanitizeTicketPrintLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_TICKET_PRINT_LAYOUT;
  }
}

export async function saveTicketPrintLayout(layout: TicketPrintLayout): Promise<TicketPrintLayout> {
  const sanitized = sanitizeTicketPrintLayout({
    ...layout,
    updatedAt: new Date().toISOString(),
  });
  const serialized = `${JSON.stringify(sanitized, null, 2)}\n`;
  const storage = await getPersistentStorage();

  if (storage) {
    const persistentStorage = await ensureConfigBucket();
    const { error } = await persistentStorage
      .from(TICKET_LAYOUT_BUCKET)
      .upload(TICKET_LAYOUT_FILENAME, serialized, { contentType: "application/json", upsert: true });
    if (error) throw error;
  } else {
    await writeFile(TICKET_LAYOUT_PATH, serialized, "utf8");
  }

  return sanitized;
}

export async function readTicketTemplateDimensions(): Promise<TicketTemplateDimensions> {
  const sharp = (await import("sharp")).default;
  const templateBytes = await loadTicketTemplateBytes();
  const metadata = await sharp(templateBytes).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  console.log(`Template:\nwidth = ${metadata.width}\nheight = ${metadata.height}`);

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

export async function readTicketPrintLayoutState(): Promise<TicketPrintLayoutState> {
  const [layout, template] = await Promise.all([readTicketPrintLayout(), readTicketTemplateDimensions()]);
  return { layout, template };
}
