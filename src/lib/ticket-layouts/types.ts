export interface OverlayBox {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
  fontSize?: number;
}

export interface TicketLayoutConfig {
  templateWidth: number;
  templateHeight: number;
  codeBoxes: OverlayBox[];
  qrBoxes: OverlayBox[];
  codeFontSize: number;
}

export type TicketLayoutType = "physical" | "digital";

export type TicketLayoutSource = "database" | "default" | "legacy";

export interface TicketLayoutRecord {
  layoutType: TicketLayoutType;
  templatePath: string;
  config: TicketLayoutConfig;
  updatedAt: string | null;
  updatedBy: string | null;
  source: TicketLayoutSource;
}

export interface StoredTicketLayoutPayload {
  templatePath?: string;
  templateWidth?: number;
  templateHeight?: number;
  codeFontSize?: number;
  codeBoxes?: OverlayBox[];
  qrBoxes?: OverlayBox[];
}
