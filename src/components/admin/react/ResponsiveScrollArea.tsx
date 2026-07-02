import { cn } from "@/lib/utils";

export function ResponsiveScrollArea({
  children,
  className,
  minWidth = "640px",
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={cn("overflow-x-auto overscroll-x-contain", className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
