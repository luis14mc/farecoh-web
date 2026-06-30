import { Ban, Building2, CheckCircle2, Clock, CreditCard, QrCode, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiItem {
  label: string;
  value: string;
  tone: "slate" | "blue" | "amber" | "green" | "purple" | "red" | "primary";
}

const toneStyles: Record<KpiItem["tone"], string> = {
  slate: "text-muted-foreground",
  blue: "text-blue-600",
  amber: "text-amber-600",
  green: "text-green-600",
  purple: "text-purple-600",
  red: "text-red-600",
  primary: "text-primary",
};

const toneIcons: Record<KpiItem["tone"], React.ReactNode> = {
  slate: <Building2 className="h-4 w-4" />,
  blue: <Truck className="h-4 w-4" />,
  amber: <Clock className="h-4 w-4" />,
  green: <CheckCircle2 className="h-4 w-4" />,
  purple: <QrCode className="h-4 w-4" />,
  red: <Ban className="h-4 w-4" />,
  primary: <CreditCard className="h-4 w-4" />,
};

interface DashboardStatsProps {
  kpis: KpiItem[];
  revenue: string;
}

export function DashboardStats({ kpis, revenue }: DashboardStatsProps) {
  const allKpis = [...kpis, { label: "Recaudación", value: revenue, tone: "primary" as const }];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {allKpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
            <span className={cn(toneStyles[kpi.tone])}>{toneIcons[kpi.tone]}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function ProgressChartCard({
  title,
  description,
  items,
  valueClassName,
  barClassName,
}: {
  title: string;
  description: string;
  items: { label: string; value: string; pct: number }[];
  valueClassName?: string;
  barClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className={cn("shrink-0 font-semibold", valueClassName)}>{item.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", barClassName)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">No hay registros recientes.</p>
        )}
      </CardContent>
    </Card>
  );
}
