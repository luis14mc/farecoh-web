import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FileDown, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TICKET_TEMPLATE_PUBLIC_PATH } from "@/lib/ticket-print-config";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "@/lib/ticket-print-measurements";
import type { TicketPrintLayout, TicketPrintLayoutState, TicketTemplateDimensions } from "@/types/ticket-print-layout";

type Target = "qr" | "code";

type Status =
  | { type: "idle"; message: string }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const STEP_PERCENT = 0.001;
const FINE_STEP_PERCENT = 0.00025;

const defaultTemplate: TicketTemplateDimensions = { width: 1, height: 1 };
const defaultLayout: TicketPrintLayout = {
  qrCenterXPercent: 0.855,
  qrCenterYPercent: 0.475,
  codeCenterXPercent: 0.855,
  codeCenterYPercent: 0.185,
  updatedAt: null,
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(3)}%`;
}

function formatPoint(value: number): string {
  return `${value.toFixed(2)} pt`;
}

function buildCalibrationPdfUrl(layout: TicketPrintLayout): string {
  const params = new URLSearchParams({
    qrCenterXPercent: String(layout.qrCenterXPercent),
    qrCenterYPercent: String(layout.qrCenterYPercent),
    codeCenterXPercent: String(layout.codeCenterXPercent),
    codeCenterYPercent: String(layout.codeCenterYPercent),
  });

  return `/api/print/calibration.pdf?${params.toString()}`;
}

function centerStyle(xPercent: number, yPercent: number) {
  return {
    left: `${xPercent * 100}%`,
    top: `${yPercent * 100}%`,
  };
}

function qrBoxStyle(layout: TicketPrintLayout, template: TicketTemplateDimensions) {
  return {
    left: `${layout.qrCenterXPercent * 100}%`,
    top: `${layout.qrCenterYPercent * 100}%`,
    width: `${(QR_WIDTH_POINTS / template.width) * 100}%`,
    height: `${(QR_HEIGHT_POINTS / template.height) * 100}%`,
  };
}

export function PrintCalibrationPanel() {
  const [template, setTemplate] = useState<TicketTemplateDimensions>(defaultTemplate);
  const [layout, setLayout] = useState<TicketPrintLayout>(defaultLayout);
  const [target, setTarget] = useState<Target>("qr");
  const [fineMode, setFineMode] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "loading", message: "Cargando plantilla y layout..." });

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      try {
        const response = await fetch("/api/print/layout", { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const state = (await response.json()) as TicketPrintLayoutState;
        if (cancelled) return;
        setTemplate(state.template);
        setLayout(state.layout);
        setStatus({ type: "idle", message: "Ajuste los centros y guarde cuando coincidan con la plantilla fÃ­sica." });
      } catch (error) {
        if (cancelled) return;
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar la calibraciÃ³n.",
        });
      }
    }

    loadLayout();
    return () => {
      cancelled = true;
    };
  }, []);

  const step = fineMode ? FINE_STEP_PERCENT : STEP_PERCENT;
  const calibrationPdfUrl = useMemo(() => buildCalibrationPdfUrl(layout), [layout]);

  function move(dx: number, dy: number) {
    setLayout((current) => {
      if (target === "qr") {
        return {
          ...current,
          qrCenterXPercent: clamp(current.qrCenterXPercent + dx),
          qrCenterYPercent: clamp(current.qrCenterYPercent + dy),
        };
      }

      return {
        ...current,
        codeCenterXPercent: clamp(current.codeCenterXPercent + dx),
        codeCenterYPercent: clamp(current.codeCenterYPercent + dy),
      };
    });
  }

  async function saveLayout() {
    setStatus({ type: "loading", message: "Guardando ticket_layout.json..." });

    try {
      const response = await fetch("/api/print/layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(layout),
      });
      if (!response.ok) throw new Error(await response.text());
      const state = (await response.json()) as TicketPrintLayoutState;
      setTemplate(state.template);
      setLayout(state.layout);
      setStatus({ type: "success", message: "Layout guardado en ticket_layout.json." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar el layout.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">CalibraciÃ³n de impresiÃ³n</p>
              <CardTitle>Plantilla fÃ­sica Pink Floyd</CardTitle>
              <CardDescription>
                Mueva los centros por porcentaje. El QR final mide {formatPoint(QR_WIDTH_POINTS)} x {formatPoint(QR_HEIGHT_POINTS)}.
              </CardDescription>
            </div>
            <Badge variant="outline">
              {template.width} x {template.height}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {status.type !== "idle" && (
        <Alert variant={status.type === "error" ? "destructive" : status.type === "success" ? "success" : "info"}>
          <AlertTitle>{status.type === "error" ? "Revisar" : "Estado"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
            <CardDescription>Overlay: cruz roja = centro QR, rectÃ¡ngulo azul = tamaÃ±o QR, cruz verde = centro cÃ³digo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border border-border bg-muted/30 p-3">
              <div className="relative mx-auto w-full min-w-[720px]" style={{ aspectRatio: `${template.width} / ${template.height}` }}>
                <img
                  src={TICKET_TEMPLATE_PUBLIC_PATH}
                  alt="Plantilla de boleto Pink Floyd"
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  draggable={false}
                />

                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 border-2 border-blue-600 bg-blue-500/10"
                  style={qrBoxStyle(layout, template)}
                  aria-hidden="true"
                />
                <div
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2"
                  style={centerStyle(layout.qrCenterXPercent, layout.qrCenterYPercent)}
                  aria-hidden="true"
                >
                  <span className="absolute left-0 top-1/2 h-0.5 w-8 -translate-y-1/2 bg-red-600" />
                  <span className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 bg-red-600" />
                </div>
                <div
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2"
                  style={centerStyle(layout.codeCenterXPercent, layout.codeCenterYPercent)}
                  aria-hidden="true"
                >
                  <span className="absolute left-0 top-1/2 h-0.5 w-8 -translate-y-1/2 bg-emerald-600" />
                  <span className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 bg-emerald-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current coordinates</CardTitle>
              <CardDescription>Valores guardados como porcentaje de ancho/alto de la plantilla.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="font-semibold text-red-700">QR center</p>
                <p>X: {formatPercent(layout.qrCenterXPercent)}</p>
                <p>Y: {formatPercent(layout.qrCenterYPercent)}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="font-semibold text-emerald-700">Code center</p>
                <p>X: {formatPercent(layout.codeCenterXPercent)}</p>
                <p>Y: {formatPercent(layout.codeCenterYPercent)}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="font-semibold">Template</p>
                <p>width = {template.width}</p>
                <p>height = {template.height}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Move {target === "qr" ? "QR" : "Code"}</CardTitle>
              <CardDescription>Use ajuste fino para movimientos de 0.025%.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={target === "qr" ? "default" : "outline"} onClick={() => setTarget("qr")}>Move QR</Button>
                <Button type="button" variant={target === "code" ? "default" : "outline"} onClick={() => setTarget("code")}>Move Code</Button>
              </div>

              <Button type="button" variant={fineMode ? "secondary" : "outline"} className="w-full" onClick={() => setFineMode((value) => !value)}>
                {fineMode ? "Ajuste fino activo" : "Activar ajuste fino"}
              </Button>

              <div className="mx-auto grid w-40 grid-cols-3 gap-2">
                <span />
                <Button type="button" variant="outline" size="icon" aria-label="Mover arriba" onClick={() => move(0, -step)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <span />
                <Button type="button" variant="outline" size="icon" aria-label="Mover izquierda" onClick={() => move(-step, 0)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Mover abajo" onClick={() => move(0, step)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Mover derecha" onClick={() => move(step, 0)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Button type="button" onClick={saveLayout} disabled={status.type === "loading"}>
                  <Save className="h-4 w-4" />
                  Save Layout
                </Button>
                <Button asChild variant="secondary">
                  <a href={calibrationPdfUrl}>
                    <FileDown className="h-4 w-4" />
                    Descargar PDF calibraciÃ³n
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}