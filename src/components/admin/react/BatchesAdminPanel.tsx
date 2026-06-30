import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { formatSiteDateTime } from "@/lib/locale";
import { SELLER_TYPE_LABELS, type SellerType } from "@/types/sellers";

interface SellerOption {
  id: string;
  name: string;
  type: SellerType;
}

interface BatchRow {
  id: string;
  name: string;
  start_code: string;
  end_code: string;
  location: string | null;
  created_at: string;
}

interface BatchStats {
  available: number;
  assigned: number;
  sold: number;
  validated: number;
  cancelled: number;
  reserved: number;
  total: number;
}

interface BatchesAdminPanelProps {
  lotLabel: string;
  rangeStart: string;
  rangeEnd: string;
  sellers: SellerOption[];
  batches: BatchRow[];
  stats: BatchStats;
  formMessage?: string;
  formError?: boolean;
}

const statCards: { key: keyof BatchStats; label: string }[] = [
  { key: "available", label: "Disponibles" },
  { key: "assigned", label: "Asignados" },
  { key: "reserved", label: "Reservados" },
  { key: "sold", label: "Vendidos" },
  { key: "validated", label: "Validados" },
  { key: "cancelled", label: "Anulados" },
  { key: "total", label: "Total" },
];

export function BatchesAdminPanel({
  lotLabel,
  rangeStart,
  rangeEnd,
  sellers,
  batches,
  stats,
  formMessage,
  formError,
}: BatchesAdminPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Lote inicial</p>
          <CardTitle>{lotLabel}</CardTitle>
          <CardDescription>
            Rango operativo: {rangeStart} – {rangeEnd}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Asignar rango</CardTitle>
            <CardDescription>Entrega boletos a un vendedor registrado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="POST" className="space-y-4">
              <input type="hidden" name="action" value="assign" />
              <div className="space-y-2">
                <Label htmlFor="start_code">Desde</Label>
                <Input id="start_code" name="start_code" required placeholder="PF-000001" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_code">Hasta</Label>
                <Input id="end_code" name="end_code" required placeholder="PF-000050" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller_id">Vendedor</Label>
                <NativeSelect id="seller_id" name="seller_id" required defaultValue="">
                  <option value="" disabled>
                    Seleccione un vendedor
                  </option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} ({SELLER_TYPE_LABELS[seller.type]})
                    </option>
                  ))}
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  <a href="/admin/vendors" className="font-medium text-primary hover:underline">
                    Registrar vendedor
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Punto físico</Label>
                <Input id="location" name="location" required placeholder="Escuela Nacional de Música" />
              </div>
              <Button type="submit" className="w-full">
                Asignar rango
              </Button>
            </form>

            {formMessage && (
              <Alert variant={formError ? "destructive" : "success"} className="mt-4">
                <AlertDescription>{formMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Resumen de lote</CardTitle>
            <CardDescription>Estado actual de los boletos físicos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ key, label }) => (
                <div key={key} className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{stats[key]}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Asignaciones</h4>
              {batches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay rangos asignados todavía.</p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="rounded-lg border bg-muted/20 p-4">
                      <p className="font-semibold">{batch.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Rango:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {batch.start_code} – {batch.end_code}
                        </span>
                        {" · "}
                        {batch.location || "Sin ubicación"}
                        {" · "}
                        {formatSiteDateTime(batch.created_at, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
