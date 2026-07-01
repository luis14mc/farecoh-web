import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TicketPrintLayout, TicketPrintLayoutState, TicketTemplateDimensions } from "../types/ticket-print-layout.ts";
import { loadTicketTemplateBytes } from "./ticket-print-template.ts";

export const DEFAULT_TICKET_PRINT_LAYOUT: TicketPrintLayout = {
  qrCenterXPercent: 0.855,
  qrCenterYPercent: 0.475,
  codeCenterXPercent: 0.855,
  codeCenterYPercent: 0.185,
  updatedAt: null,
};

export const TICKET_LAYOUT_FILENAME = "ticket_layout.json";
export const TICKET_LAYOUT_PATH = path.join(process.cwd(), TICKET_LAYOUT_FILENAME);

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

  await writeFile(TICKET_LAYOUT_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
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