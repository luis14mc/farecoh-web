import { Ban, Building2, CheckCircle2, Clock, CreditCard, QrCode, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface KpiItem {
  label: string;
  value: string;
  tone: "slate" | "blue" | "amber" | "green" | "purple" | "red" | "primary";
}

const toneStyles: Record<KpiItem["tone"], { icon: string; container: string }> = {
  slate: {
    icon: "text-muted-foreground",
    container: "bg-muted text-muted-foreground",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    container: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    container: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  green: {
    icon: "text-emerald-600 dark:text-emerald-400",
    container: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    icon: "text-purple-600 dark:text-purple-400",
    container: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    container: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  primary: {
    icon: "text-primary",
    container: "bg-primary/10 text-primary",
  },
};

const toneIcons: Record<KpiItem["tone"], React.ReactNode> = {
  slate: <Building2 className="h-4 w-4" />,
  blue: <Ticket className="h-4 w-4" />,
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
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {allKpis.map((kpi) => {
        const toneConfig = toneStyles[kpi.tone] || toneStyles.slate;
        return (
          <Card key={kpi.label} className="border-border/60 transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneConfig.container)}>
                {toneIcons[kpi.tone]}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{kpi.value}</div>
            </CardContent>
          </Card>
        );
      })}
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
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-xs font-medium text-muted-foreground">{item.label}</span>
                  <span className={cn("shrink-0 font-mono text-xs font-semibold", valueClassName)}>{item.value}</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, item.pct))} className={cn("h-1.5", barClassName)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay registros recientes.</p>
        )}
      </CardContent>
    </Card>
  );
}
