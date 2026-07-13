import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  FileDown,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIGITAL_TICKET_TEMPLATE_PATH,
  DEFAULT_DIGITAL_TICKET_LAYOUT,
} from "@/lib/ticket-layouts/digital-ticket-layout";
import {
  PHYSICAL_TICKET_TEMPLATE_PATH,
  DEFAULT_PHYSICAL_TICKET_LAYOUT,
} from "@/lib/ticket-layouts/physical-ticket-layout";
import type { OverlayBox, TicketLayoutConfig, TicketLayoutType } from "@/lib/ticket-layouts/types";

type StepSize = 1 | 5 | 10;

type Status =
  | { type: "idle"; message: string }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

interface LayoutStateResponse {
  layoutType: TicketLayoutType;
  templatePath: string;
  config: TicketLayoutConfig;
  template: { width: number; height: number };
  canEdit: boolean;
  updatedAt: string | null;
}

const TEST_TICKET_CODE = "PF-000001";

const PHYSICAL_TARGETS = [
  { id: "code0", label: "Código izquierdo", kind: "code" as const, index: 0 },
  { id: "qr0", label: "QR izquierdo", kind: "qr" as const, index: 0 },
  { id: "code1", label: "Código derecho", kind: "code" as const, index: 1 },
  { id: "qr1", label: "QR derecho", kind: "qr" as const, index: 1 },
];

const DIGITAL_TARGETS = [
  { id: "code0", label: "Número de boleto", kind: "code" as const, index: 0 },
  { id: "qr0", label: "Código QR", kind: "qr" as const, index: 0 },
];

function overlayStyle(box: OverlayBox, template: { width: number; height: number }) {
  return {
    left: `${(box.x / template.width) * 100}%`,
    top: `${(box.y / template.height) * 100}%`,
    width: `${(box.width / template.width) * 100}%`,
    height: `${(box.height / template.height) * 100}%`,
  };
}

function getTargetBox(config: TicketLayoutConfig, kind: "code" | "qr", index: number): OverlayBox {
  return kind === "code" ? config.codeBoxes[index] : config.qrBoxes[index];
}

function updateTargetBox(
  config: TicketLayoutConfig,
  kind: "code" | "qr",
  index: number,
  patch: Partial<OverlayBox>,
): TicketLayoutConfig {
  if (kind === "code") {
    const codeBoxes = config.codeBoxes.map((box, i) => (i === index ? { ...box, ...patch } : box));
    return { ...config, codeBoxes };
  }
  const qrBoxes = config.qrBoxes.map((box, i) => (i === index ? { ...box, ...patch } : box));
  return { ...config, qrBoxes };
}

function buildCalibrationPdfUrl(config: TicketLayoutConfig): string {
  const params = new URLSearchParams({
    codeFontSize: String(config.codeFontSize),
  });
  config.codeBoxes.forEach((box, index) => {
    params.set(`code${index}X`, String(box.x));
    params.set(`code${index}Y`, String(box.y));
    params.set(`code${index}W`, String(box.width));
    params.set(`code${index}H`, String(box.height));
  });
  config.qrBoxes.forEach((box, index) => {
    params.set(`qr${index}X`, String(box.x));
    params.set(`qr${index}Y`, String(box.y));
    params.set(`qr${index}W`, String(box.width));
    params.set(`qr${index}H`, String(box.height));
  });
  return `/api/print/calibration.pdf?${params.toString()}`;
}

interface CalibrationTabProps {
  layoutType: TicketLayoutType;
  templatePath: string;
  defaults: TicketLayoutConfig;
  targets: typeof PHYSICAL_TARGETS;
  title: string;
  description: string;
}

function CalibrationTab({
  layoutType,
  templatePath,
  defaults,
  targets,
  title,
  description,
}: CalibrationTabProps) {
  const [template, setTemplate] = useState(defaults);
  const [config, setConfig] = useState<TicketLayoutConfig>(defaults);
  const [selectedTarget, setSelectedTarget] = useState(targets[0].id);
  const [step, setStep] = useState<StepSize>(5);
  const [canEdit, setCanEdit] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [status, setStatus] = useState<Status>({ type: "loading", message: "Cargando calibración..." });

  const activeTarget = targets.find((t) => t.id === selectedTarget) ?? targets[0];
  const activeBox = getTargetBox(config, activeTarget.kind, activeTarget.index);

  const loadLayout = useCallback(async () => {
    setStatus({ type: "loading", message: "Cargando calibración..." });
    try {
      const response = await fetch(`/api/ticket-layouts/${layoutType}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const state = (await response.json()) as LayoutStateResponse;
      setTemplate(state.template);
      setConfig(state.config);
      setCanEdit(state.canEdit);
      setStatus({ type: "idle", message: "Ajuste las coordenadas en píxeles de la plantilla original." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar la calibración.",
      });
    }
  }, [layoutType]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const previewUrl = useMemo(
    () => `/api/ticket-layouts/${layoutType}/preview?ticketCode=${TEST_TICKET_CODE}&v=${previewKey}`,
    [layoutType, previewKey],
  );

  const calibrationPdfUrl = useMemo(
    () => (layoutType === "physical" ? buildCalibrationPdfUrl(config) : null),
    [layoutType, config],
  );

  function patchActiveBox(patch: Partial<OverlayBox>) {
    setConfig((current) => updateTargetBox(current, activeTarget.kind, activeTarget.index, patch));
  }

  function move(dx: number, dy: number) {
    patchActiveBox({
      x: Math.max(0, activeBox.x + dx),
      y: Math.max(0, activeBox.y + dy),
    });
  }

  async function saveLayout() {
    if (!canEdit) {
      setStatus({ type: "error", message: "No tiene permiso para guardar la calibración." });
      return;
    }

    setStatus({ type: "loading", message: "Guardando configuración..." });
    try {
      const response = await fetch(`/api/ticket-layouts/${layoutType}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error(await response.text());
      const state = (await response.json()) as LayoutStateResponse;
      setConfig(state.config);
      setTemplate(state.template);
      setStatus({ type: "success", message: "Configuración guardada correctamente." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar la configuración.",
      });
    }
  }

  async function restoreDefaults() {
    if (!canEdit) {
      setStatus({ type: "error", message: "No tiene permiso para restaurar la calibración." });
      return;
    }

    setStatus({ type: "loading", message: "Restaurando valores..." });
    try {
      const response = await fetch(`/api/ticket-layouts/${layoutType}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      const state = (await response.json()) as LayoutStateResponse;
      setConfig(state.config);
      setTemplate(state.template);
      setPreviewKey((value) => value + 1);
      setStatus({ type: "success", message: "Valores restaurados." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo restaurar la calibración.",
      });
    }
  }

  function refreshPreview() {
    setPreviewKey((value) => value + 1);
    setStatus({ type: "idle", message: "Vista previa actualizada." });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant="outline">
              {template.width} × {template.height} px
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plantilla</CardTitle>
              <CardDescription>Rectángulos verdes: código. Rectángulos azules: QR.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-muted/30 p-3">
                <div
                  className="relative mx-auto w-full max-w-full min-w-[280px] sm:min-w-[480px] lg:min-w-[640px]"
                  style={{ aspectRatio: `${template.width} / ${template.height}` }}
                >
                  <img
                    src={templatePath}
                    alt={title}
                    className="absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                  />
                  {config.codeBoxes.map((box, index) => (
                    <div
                      key={`code-${index}`}
                      className="absolute border-2 border-emerald-600 bg-emerald-500/10 pointer-events-none"
                      style={overlayStyle(box, template)}
                      aria-hidden="true"
                    />
                  ))}
                  {config.qrBoxes.map((box, index) => (
                    <div
                      key={`qr-${index}`}
                      className="absolute border-2 border-blue-600 bg-blue-500/10 pointer-events-none"
                      style={overlayStyle(box, template)}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista previa en vivo</CardTitle>
              <CardDescription>Boleto de prueba: {TEST_TICKET_CODE}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-3">
                <img
                  src={previewUrl}
                  alt={`Vista previa ${title}`}
                  className="mx-auto max-h-[480px] w-auto object-contain"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elemento activo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {targets.map((target) => (
                <Button
                  key={target.id}
                  type="button"
                  size="sm"
                  variant={selectedTarget === target.id ? "default" : "outline"}
                  onClick={() => setSelectedTarget(target.id)}
                >
                  {target.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordenadas (px)</CardTitle>
              <CardDescription>{activeTarget.label}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${layoutType}-x`}>X</Label>
                <Input
                  id={`${layoutType}-x`}
                  type="number"
                  value={activeBox.x}
                  onChange={(e) => patchActiveBox({ x: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${layoutType}-y`}>Y</Label>
                <Input
                  id={`${layoutType}-y`}
                  type="number"
                  value={activeBox.y}
                  onChange={(e) => patchActiveBox({ y: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${layoutType}-w`}>Ancho</Label>
                <Input
                  id={`${layoutType}-w`}
                  type="number"
                  value={activeBox.width}
                  onChange={(e) => patchActiveBox({ width: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${layoutType}-h`}>Alto</Label>
                <Input
                  id={`${layoutType}-h`}
                  type="number"
                  value={activeBox.height}
                  onChange={(e) => patchActiveBox({ height: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              {activeTarget.kind === "code" && (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor={`${layoutType}-font`}>Tamaño de fuente</Label>
                  <Input
                    id={`${layoutType}-font`}
                    type="number"
                    value={config.codeFontSize}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        codeFontSize: Math.max(8, Number(e.target.value) || current.codeFontSize),
                      }))
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([1, 5, 10] as StepSize[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={step === value ? "default" : "outline"}
                    onClick={() => setStep(value)}
                  >
                    {value} px
                  </Button>
                ))}
              </div>

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
                <Button type="button" variant="secondary" onClick={refreshPreview}>
                  <Eye className="h-4 w-4" />
                  Vista previa
                </Button>
                <Button type="button" variant="outline" onClick={restoreDefaults} disabled={!canEdit}>
                  <RotateCcw className="h-4 w-4" />
                  Restaurar valores
                </Button>
                <Button type="button" onClick={saveLayout} disabled={!canEdit || status.type === "loading"}>
                  <Save className="h-4 w-4" />
                  Guardar configuración
                </Button>
                <Button type="button" variant="secondary" onClick={() => window.open(previewUrl, "_blank")}>
                  <Sparkles className="h-4 w-4" />
                  Generar prueba
                </Button>
                {calibrationPdfUrl && (
                  <Button asChild variant="outline">
                    <a href={calibrationPdfUrl}>
                      <FileDown className="h-4 w-4" />
                      PDF calibración (físico)
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PrintCalibrationPanel() {
  return (
    <Tabs defaultValue="physical" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="physical">Boleto físico</TabsTrigger>
        <TabsTrigger value="digital">Boleto digital</TabsTrigger>
      </TabsList>

      <TabsContent value="physical">
        <CalibrationTab
          layoutType="physical"
          templatePath={PHYSICAL_TICKET_TEMPLATE_PATH}
          defaults={DEFAULT_PHYSICAL_TICKET_LAYOUT}
          targets={PHYSICAL_TARGETS}
          title="Boleto físico"
          description="Dos secciones desprendibles: el mismo código y el mismo QR en ambos lados."
        />
      </TabsContent>

      <TabsContent value="digital">
        <CalibrationTab
          layoutType="digital"
          templatePath={DIGITAL_TICKET_TEMPLATE_PATH}
          defaults={DEFAULT_DIGITAL_TICKET_LAYOUT}
          targets={DIGITAL_TARGETS}
          title="Boleto digital"
          description="Un número de boleto y un código QR sobre la plantilla digital."
        />
      </TabsContent>
    </Tabs>
  );
}
