import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { UserProfile } from "./auth.ts";
import {
  DEFAULT_DIGITAL_TICKET_LAYOUT,
  DIGITAL_TICKET_TEMPLATE_FALLBACK,
  DIGITAL_TICKET_TEMPLATE_FILENAME,
  restoreDigitalTicketLayout,
} from "./ticket-layouts/digital-ticket-layout.ts";
import {
  DEFAULT_PHYSICAL_TICKET_LAYOUT,
  PHYSICAL_TICKET_TEMPLATE_FILENAME,
  restorePhysicalTicketLayout,
} from "./ticket-layouts/physical-ticket-layout.ts";
import type { TicketLayoutConfig, TicketLayoutRecord, TicketLayoutType } from "./ticket-layouts/types.ts";
import { sanitizeTicketLayoutConfig } from "./ticket-image-compose.ts";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "./ticket-print-measurements.ts";
import { readTicketPrintLayout } from "./ticket-print-layout-config.ts";
import type { TicketPrintLayout } from "../types/ticket-print-layout.ts";

const LAYOUT_DEFAULTS: Record<TicketLayoutType, TicketLayoutConfig> = {
  physical: DEFAULT_PHYSICAL_TICKET_LAYOUT,
  digital: DEFAULT_DIGITAL_TICKET_LAYOUT,
};

const LAYOUT_TEMPLATE_PATHS: Record<TicketLayoutType, string> = {
  physical: `/templates/${PHYSICAL_TICKET_TEMPLATE_FILENAME}`,
  digital: `/templates/${DIGITAL_TICKET_TEMPLATE_FILENAME}`,
};

export function canEditTicketLayouts(profile: UserProfile | null | undefined): boolean {
  return profile?.role === "super_admin" || profile?.role === "event_manager";
}

function layoutDefaults(type: TicketLayoutType): TicketLayoutConfig {
  return type === "physical" ? restorePhysicalTicketLayout() : restoreDigitalTicketLayout();
}

function legacyPercentToPhysicalConfig(legacy: TicketPrintLayout): TicketLayoutConfig {
  const defaults = restorePhysicalTicketLayout();
  const templateWidth = defaults.templateWidth;
  const templateHeight = defaults.templateHeight;

  const rightCodeCenterX = templateWidth * legacy.codeCenterXPercent;
  const rightCodeCenterY = templateHeight * legacy.codeCenterYPercent;
  const rightQrCenterX = templateWidth * legacy.qrCenterXPercent;
  const rightQrCenterY = templateHeight * legacy.qrCenterYPercent;
  const qrSize = Math.round(QR_WIDTH_POINTS);

  const rightCodeBox = {
    x: Math.round(rightCodeCenterX - 100),
    y: Math.round(rightCodeCenterY - 20),
    width: 200,
    height: 40,
  };
  const rightQrBox = {
    x: Math.round(rightQrCenterX - qrSize / 2),
    y: Math.round(rightQrCenterY - qrSize / 2),
    width: qrSize,
    height: qrSize,
  };

  const mirrorX = (centerX: number) => templateWidth - centerX;

  const leftCodeCenterX = mirrorX(rightCodeCenterX);
  const leftQrCenterX = mirrorX(rightQrCenterX);

  return sanitizeTicketLayoutConfig(
    {
      templateWidth,
      templateHeight,
      codeFontSize: defaults.codeFontSize,
      codeBoxes: [
        {
          x: Math.round(leftCodeCenterX - 100),
          y: rightCodeBox.y,
          width: 200,
          height: 40,
        },
        rightCodeBox,
      ],
      qrBoxes: [
        {
          x: Math.round(leftQrCenterX - qrSize / 2),
          y: rightQrBox.y,
          width: qrSize,
          height: qrSize,
        },
        rightQrBox,
      ],
    },
    defaults,
  );
}

async function readLegacyPhysicalLayout(): Promise<TicketLayoutConfig | null> {
  try {
    const legacy = await readTicketPrintLayout();
    return legacyPercentToPhysicalConfig(legacy);
  } catch {
    return null;
  }
}

async function getSupabaseAdmin() {
  try {
    const { supabaseAdmin } = await import("./supabase.ts");
    return supabaseAdmin ?? null;
  } catch {
    return null;
  }
}

export async function readTicketLayoutConfig(type: TicketLayoutType): Promise<TicketLayoutRecord> {
  const defaults = layoutDefaults(type);

  try {
    const supabase = await getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from("ticket_layout_configs")
        .select("layout_type, template_path, config, updated_at, updated_by")
        .eq("layout_type", type)
        .maybeSingle();

      if (!error && data) {
        return {
          layoutType: type,
          templatePath: data.template_path,
          config: sanitizeTicketLayoutConfig(data.config, defaults),
          updatedAt: data.updated_at,
          updatedBy: data.updated_by,
        };
      }
    }
  } catch (error) {
    console.warn(`No se pudo leer ticket_layout_configs (${type}).`, error);
  }

  if (type === "physical") {
    const legacy = await readLegacyPhysicalLayout();
    if (legacy) {
      return {
        layoutType: type,
        templatePath: LAYOUT_TEMPLATE_PATHS[type],
        config: legacy,
        updatedAt: null,
        updatedBy: null,
      };
    }
  }

  return {
    layoutType: type,
    templatePath: LAYOUT_TEMPLATE_PATHS[type],
    config: defaults,
    updatedAt: null,
    updatedBy: null,
  };
}

export async function saveTicketLayoutConfig(
  type: TicketLayoutType,
  configInput: unknown,
  updatedBy: string,
): Promise<TicketLayoutRecord> {
  const defaults = layoutDefaults(type);
  const config = sanitizeTicketLayoutConfig(configInput, defaults);
  const supabase = await getSupabaseAdmin();

  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY es necesaria para guardar la calibración en producción.");
  }

  const payload = {
    layout_type: type,
    template_path: LAYOUT_TEMPLATE_PATHS[type],
    config,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  const { error } = await supabase.from("ticket_layout_configs").upsert(payload, {
    onConflict: "layout_type",
  });

  if (error) throw error;

  return readTicketLayoutConfig(type);
}

async function readTemplateBytesFromDisk(filenames: string[]): Promise<Buffer | null> {
  for (const filename of filenames) {
    const candidate = path.join(process.cwd(), "public/templates", filename);
    try {
      return await readFile(candidate);
    } catch {
      // try next
    }
  }
  return null;
}

export async function loadPhysicalTemplateBytes(): Promise<Buffer> {
  const bytes = await readTemplateBytesFromDisk([PHYSICAL_TICKET_TEMPLATE_FILENAME]);
  if (!bytes) throw new Error("No se encontró la plantilla física ticket-pink-floyd.png.");
  return bytes;
}

export async function loadDigitalTemplateBytes(): Promise<Buffer> {
  const fromDisk = await readTemplateBytesFromDisk([
    DIGITAL_TICKET_TEMPLATE_FILENAME,
    DIGITAL_TICKET_TEMPLATE_FALLBACK,
  ]);
  if (fromDisk) return fromDisk;

  try {
    const { loadBundledDigitalTicketTemplateBytes } = await import("./ticket-delivery-bundle.ts");
    const fromBundle = loadBundledDigitalTicketTemplateBytes();
    if (fromBundle) return fromBundle;
  } catch {
    // no bundled fallback
  }

  throw new Error("No se pudo cargar la plantilla digital.");
}

export async function readTemplateDimensions(type: TicketLayoutType): Promise<{ width: number; height: number }> {
  const templateBytes =
    type === "physical" ? await loadPhysicalTemplateBytes() : await loadDigitalTemplateBytes();
  const metadata = await sharp(templateBytes).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  return { width: metadata.width, height: metadata.height };
}

export async function readTicketLayoutState(type: TicketLayoutType) {
  const [record, template] = await Promise.all([readTicketLayoutConfig(type), readTemplateDimensions(type)]);

  return {
    ...record,
    template,
  };
}

export { LAYOUT_DEFAULTS, QR_HEIGHT_POINTS, QR_WIDTH_POINTS };
