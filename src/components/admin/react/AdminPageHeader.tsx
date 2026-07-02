import { Calendar, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserProfile, createSupabaseBrowserClient } from "@/lib/auth";

interface AdminPageHeaderProps {
  title: string;
  section?: string;
  description?: string;
  currentDate: string;
  staffProfile?: UserProfile;
  authConfigured: boolean;
}

async function signOutAndRedirect(authConfigured: boolean) {
  if (authConfigured) {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }
  window.location.assign("/admin/login");
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
    <header className="sticky top-[var(--admin-mobile-top)] z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:top-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8 md:py-5">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ol className="inline-flex flex-wrap items-center gap-1">
              <li>
                <a className="transition-colors hover:text-primary" href="/admin">
                  Admin
                </a>
              </li>
              <li aria-hidden="true" className="text-muted-foreground/50">
                /
              </li>
              <li className="text-primary">{section}</li>
            </ol>
          </nav>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {staffProfile && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {ROLE_LABELS[staffProfile.role]}
            </Badge>
          )}
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </span>
          <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => void signOutAndRedirect(authConfigured)}>
            <LogOut className="h-4 w-4" />
            Salir
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
