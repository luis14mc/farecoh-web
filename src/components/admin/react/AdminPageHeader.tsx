import { Calendar, ChevronRight, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserProfile } from "@/lib/auth";

interface AdminPageHeaderProps {
  title: string;
  section?: string;
  description?: string;
  currentDate: string;
  staffProfile?: UserProfile;
  authConfigured: boolean;
}

async function signOutAndRedirect(_authConfigured: boolean) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.assign("/admin/login");
  }
}

export function AdminPageHeader({
  title,
  section = "Administración",
  description,
  currentDate,
  staffProfile,
  authConfigured,
}: AdminPageHeaderProps) {
  return (
    <header className="sticky top-[var(--admin-mobile-top)] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:top-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8 md:py-5">
        <div className="min-w-0 space-y-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <a className="transition-colors hover:text-foreground" href="/admin">
              Admin
            </a>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-semibold text-foreground">{section}</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
          {staffProfile && (
            <Badge variant="secondary" className="hidden font-medium tracking-wide sm:inline-flex">
              {ROLE_LABELS[staffProfile.role]}
            </Badge>
          )}
          <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{currentDate}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 md:inline-flex"
            onClick={() => void signOutAndRedirect(authConfigured)}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function AdminPageContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`admin-page-content mx-auto w-full max-w-7xl space-y-6 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}
