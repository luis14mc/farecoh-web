export interface OverlayBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TicketLayoutConfig {
  templateWidth: number;
  templateHeight: number;
  codeBoxes: OverlayBox[];
  qrBoxes: OverlayBox[];
  codeFontSize: number;
}

export type TicketLayoutType = "physical" | "digital";

export interface TicketLayoutRecord {
  layoutType: TicketLayoutType;
  templatePath: string;
  config: TicketLayoutConfig;
  updatedAt: string | null;
  updatedBy: string | null;
}
