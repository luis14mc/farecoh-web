import { cn } from "@/lib/utils";

interface AdminMobileActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/** Fixed bottom bar for primary actions on small screens (safe-area aware). */
export function AdminMobileActionBar({ children, className }: AdminMobileActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
