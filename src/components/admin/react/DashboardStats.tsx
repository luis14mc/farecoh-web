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
  /** Si se omite, la recaudación se muestra en el resumen del evento. */
  revenue?: string;
}

export function DashboardStats({ kpis, revenue }: DashboardStatsProps) {
  const allKpis = revenue ? [...kpis, { label: "Recaudación", value: revenue, tone: "primary" as const }] : kpis;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Estado de boletos">
      {allKpis.map((kpi) => {
        const toneConfig = toneStyles[kpi.tone] || toneStyles.slate;
        return (
          <Card key={kpi.label} className="border-border/60 shadow-none transition-colors hover:border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneConfig.container)}>
                {toneIcons[kpi.tone]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="tabular text-xl font-bold leading-tight tracking-tight text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

interface OverviewSegment {
  label: string;
  count: number;
  color: string;
}

export function EventOverviewCard({
  eventName,
  capacity,
  sold,
  validated,
  revenue,
  segments,
}: {
  eventName: string;
  capacity: number;
  sold: number;
  validated: number;
  revenue: string;
  segments: OverviewSegment[];
}) {
  const fmt = (n: number) => n.toLocaleString("es-HN");
  const pct = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
  const total = Math.max(capacity, segments.reduce((a, s) => a + s.count, 0), 1);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#00507c] p-6 text-white shadow-sm md:p-7" aria-label="Resumen del evento">
      <svg className="pointer-events-none absolute -right-10 bottom-0 h-full w-2/3 opacity-[0.07]" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C 50 10, 100 110, 150 60 S 250 10, 300 60 S 380 100, 400 60" fill="none" stroke="#83cfff" strokeWidth="2" />
        <path d="M0 75 C 60 40, 110 110, 170 75 S 270 30, 330 75 S 390 95, 400 80" fill="none" stroke="#fff" strokeWidth="1" />
      </svg>

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#83cfff]">Evento activo</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">{eventName}</h2>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="tabular text-4xl font-bold tracking-tight md:text-5xl">{fmt(sold)}</span>
            <span className="text-sm text-white/55">
              de {fmt(capacity)} vendidos · <span className="font-semibold text-white">{pct}%</span>
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Ocupación ${pct}%`}>
              {segments.map((seg) =>
                seg.count > 0 ? (
                  <div key={seg.label} className="h-full" style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }} />
                ) : null,
              )}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
              {segments.map((seg) => (
                <li key={seg.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                  {seg.label} <span className="tabular font-semibold text-white/85">{fmt(seg.count)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 lg:w-72">
          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-white/50">Recaudación</dt>
            <dd className="tabular mt-1 text-lg font-bold">{revenue}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-white/50">Ingresaron</dt>
            <dd className="tabular mt-1 text-lg font-bold">{fmt(validated)}</dd>
          </div>
        </dl>
      </div>
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
                  <span className={cn("tabular shrink-0 text-xs font-semibold", valueClassName)}>{item.value}</span>
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
