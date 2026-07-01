export interface TicketPrintLayout {
  qrCenterXPercent: number;
  qrCenterYPercent: number;
  codeCenterXPercent: number;
  codeCenterYPercent: number;
  updatedAt: string | null;
}

export interface TicketTemplateDimensions {
  width: number;
  height: number;
}

export interface TicketPrintLayoutState {
  layout: TicketPrintLayout;
  template: TicketTemplateDimensions;
}
