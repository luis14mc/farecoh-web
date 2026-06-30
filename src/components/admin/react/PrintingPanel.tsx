import { useMemo, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
  FULL_PRINT_FROM,
  FULL_PRINT_TO,
  MAX_PRINT_TICKETS_PER_REQUEST,
} from "@/lib/ticket-print-config";

interface PrintingPanelProps {
  eventName: string;
}

function buildPrintUrl(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `/api/print/tickets?${params.toString()}`;
}

export function PrintingPanel({ eventName }: PrintingPanelProps) {
  const [fromCode, setFromCode] = useState(DEFAULT_TEST_PRINT_FROM);
  const [toCode, setToCode] = useState(DEFAULT_TEST_PRINT_TO);

  const rangePrintUrl = useMemo(() => buildPrintUrl(fromCode.trim(), toCode.trim()), [fromCode, toCode]);
  const fullPrintUrl = useMemo(() => buildPrintUrl(FULL_PRINT_FROM, FULL_PRINT_TO), []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Evento activo</p>
          <CardTitle>{eventName}</CardTitle>
          <CardDescription>
            Genera PDFs imprimibles con la plantilla Canva, código de boleto y QR de consulta. No incluye datos de
            compradores.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rango de boletos</CardTitle>
          <CardDescription>
            Seleccione el rango de códigos PF. Máximo {MAX_PRINT_TICKETS_PER_REQUEST} boletos por PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="print-from">Desde</Label>
              <Input
                id="print-from"
                value={fromCode}
                onChange={(event) => setFromCode(event.target.value.toUpperCase())}
                placeholder="PF-000001"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="print-to">Hasta</Label>
              <Input
                id="print-to"
                value={toCode}
                onChange={(event) => setToCode(event.target.value.toUpperCase())}
                placeholder="PF-000005"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={rangePrintUrl}>
                <Printer className="h-4 w-4" />
                Generar PDF de prueba
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={fullPrintUrl}>
                <FileDown className="h-4 w-4" />
                Generar PDF completo
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Prueba por defecto: {DEFAULT_TEST_PRINT_FROM} – {DEFAULT_TEST_PRINT_TO}. Completo: {FULL_PRINT_FROM} –{" "}
            {FULL_PRINT_TO}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantilla</CardTitle>
          <CardDescription>
            El fondo se toma de <code className="text-xs">public/templates/ticket-pink-floyd.png</code>. Cada página
            incluye el código y un QR a <code className="text-xs">https://www.farecoh.org/t/&#123;qr_token&#125;</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
