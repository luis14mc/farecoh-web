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
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
