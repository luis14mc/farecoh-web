import { Bookmark, CheckCircle2, CreditCard, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SalesMetric {
  label: string;
  value: string;
  hint?: string;
  tone?: "green" | "amber" | "primary" | "purple" | "blue";
}

const toneStyles: Record<NonNullable<SalesMetric["tone"]>, string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  primary: "text-primary",
  purple: "text-purple-600",
  blue: "text-blue-600",
};

const toneIcons: Record<NonNullable<SalesMetric["tone"]>, React.ReactNode> = {
  green: <Ticket className="h-4 w-4" />,
  amber: <Bookmark className="h-4 w-4" />,
  primary: <CreditCard className="h-4 w-4" />,
  purple: <CheckCircle2 className="h-4 w-4" />,
  blue: <Ticket className="h-4 w-4" />,
};

interface SalesMetricsPanelProps {
  metrics: SalesMetric[];
}

export function SalesMetricsPanel({ metrics }: SalesMetricsPanelProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => {
        const tone = metric.tone ?? "primary";
        return (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              <span className={cn(toneStyles[tone])}>{toneIcons[tone]}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.hint ? <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
