import { useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type UserProfile, createSupabaseBrowserClient } from "@/lib/auth";
import type { AdminNavItem, AdminNavKey } from "@/lib/admin-nav";
import { ADMIN_NAV_ICONS, LogOut, Menu } from "@/lib/admin-nav-icons";

export interface AdminShellProps {
  active: AdminNavKey;
  navItems: AdminNavItem[];
  staffProfile?: UserProfile;
  authConfigured: boolean;
  children: React.ReactNode;
}

function NavLinks({
  items,
  active,
  onNavigate,
}: {
  items: AdminNavItem[];
  active: AdminNavKey;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Menú administrativo">
      {items.map((item) => {
        const Icon = ADMIN_NAV_ICONS[item.key];
        const isActive = active === item.key;
        return (
          <a
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function ProfileCard({ staffProfile }: { staffProfile: UserProfile }) {
  return (
    <div className="mb-5 rounded-lg border bg-muted/50 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{staffProfile.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{staffProfile.email}</p>
          <div className="mt-2">
            <Badge variant="outline">{ROLE_LABELS[staffProfile.role]}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

async function signOutAndRedirect(authConfigured: boolean) {
  if (authConfigured) {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }
  window.location.assign("/admin/login");
}

function LogoutButton({ authConfigured, className }: { authConfigured: boolean; className?: string }) {
  return (
    <Button variant="outline" className={cn("w-full", className)} onClick={() => void signOutAndRedirect(authConfigured)}>
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </Button>
  );
}

export function AdminShell({ active, navItems, staffProfile, authConfigured, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </Button>
        <a href="/admin" className="min-w-0 flex-1 px-3">
          <p className="truncate text-sm font-semibold">FARECOH Admin</p>
        </a>
        <div className="flex items-center gap-2">
          {staffProfile && (
            <Badge variant="outline" className="max-w-[7rem] truncate">
              {ROLE_LABELS[staffProfile.role]}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => void signOutAndRedirect(authConfigured)} aria-label="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:bg-background">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-6 px-1">
            <a href="/admin" aria-label="Panel administrativo">
              <p className="text-lg font-bold tracking-tight">FARECOH</p>
            </a>
            <p className="mt-1 text-xs text-muted-foreground">Portal operativo</p>
          </div>

          {staffProfile && <ProfileCard staffProfile={staffProfile} />}
          <NavLinks items={navItems} active={active} />
          <LogoutButton authConfigured={authConfigured} className="mt-4" />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(88vw,20rem)] p-4">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>FARECOH Admin</SheetTitle>
          </SheetHeader>
          {staffProfile && <ProfileCard staffProfile={staffProfile} />}
          <NavLinks items={navItems} active={active} onNavigate={() => setMobileOpen(false)} />
          <Separator className="my-4" />
          <LogoutButton authConfigured={authConfigured} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <main className="min-h-screen pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
