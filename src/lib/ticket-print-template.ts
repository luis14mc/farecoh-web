import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { getCanvaSiteUrl } from "./canva-export.ts";
import {
  TICKET_TEMPLATE_PUBLIC_PATH,
  TICKET_TEMPLATE_RELATIVE_PATH,
} from "./ticket-print-config.ts";

export const TICKET_TEMPLATE_PATH = path.join(process.cwd(), TICKET_TEMPLATE_RELATIVE_PATH);

export function resolveTicketTemplateUrl(): string {
  return `${getCanvaSiteUrl()}${TICKET_TEMPLATE_PUBLIC_PATH}`;
}

function isPngBuffer(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

async function loadBundledTemplateBytes(): Promise<Buffer | null> {
  try {
    const { loadBundledTicketTemplateBytes } = await import("./ticket-template-bundle.ts");
    return loadBundledTicketTemplateBytes();
  } catch {
    return null;
  }
}

async function fetchTemplateBytes(templateUrl: string): Promise<Buffer> {
  const response = await fetch(templateUrl, {
    cache: "no-store",
    redirect: "follow",
    headers: { accept: "image/png,image/*" },
  });

  if (!response.ok) {
    throw new Error(
      `Plantilla no encontrada. Verifique ${TICKET_TEMPLATE_PUBLIC_PATH} (${response.status} desde ${templateUrl}).`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(`La URL de plantilla devolvió HTML en lugar de PNG (${templateUrl}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!isPngBuffer(buffer)) {
    throw new Error(`La respuesta de ${templateUrl} no es un PNG válido.`);
  }

  return buffer;
}

async function readTemplateFromFilesystem(): Promise<Buffer | null> {
  const candidates = [
    TICKET_TEMPLATE_PATH,
    path.join(process.cwd(), TICKET_TEMPLATE_PUBLIC_PATH.replace(/^\//, "")),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return readFile(candidate);
    } catch {
      // try next path
    }
  }

  return null;
}

export async function loadTicketTemplateBytes(): Promise<Buffer> {
  const fromDisk = await readTemplateFromFilesystem();
  if (fromDisk) {
    if (!isPngBuffer(fromDisk)) {
      throw new Error("El archivo de plantilla en disco no es un PNG válido.");
    }
    return fromDisk;
  }

  const fromBundle = await loadBundledTemplateBytes();
  if (fromBundle) {
    return fromBundle;
  }

  return fetchTemplateBytes(resolveTicketTemplateUrl());
}

export async function ensureTicketTemplateExists(): Promise<void> {
  await loadTicketTemplateBytes();
}