import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type UserProfile } from "@/lib/auth";
import type { AdminNavItem, AdminNavKey } from "@/lib/admin-nav";
import { ADMIN_NAV_ICONS, LogOut, Menu } from "@/lib/admin-nav-icons";

export interface AdminShellProps {
  active: AdminNavKey;
  navItems: AdminNavItem[];
  staffProfile?: UserProfile;
  authConfigured: boolean;
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
    <nav className="flex-1 space-y-1 overflow-y-auto py-2" aria-label="Menú administrativo">
      {items.map((item) => {
        const Icon = ADMIN_NAV_ICONS[item.key];
        const isActive = active === item.key;
        return (
          <a
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </div>
            {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
          </a>
        );
      })}
    </nav>
  );
}

function ProfileCard({ staffProfile }: { staffProfile: UserProfile }) {
  const initials = staffProfile.full_name
    ? staffProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <div className="mb-5 rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{staffProfile.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{staffProfile.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
              {ROLE_LABELS[staffProfile.role]}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

async function signOutAndRedirect(_authConfigured: boolean) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.assign("/admin/login");
  }
}

function LogoutButton({ authConfigured, className }: { authConfigured: boolean; className?: string }) {
  return (
    <Button variant="outline" className={cn("w-full justify-start gap-2 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30", className)} onClick={() => void signOutAndRedirect(authConfigured)}>
      <LogOut className="h-4 w-4" />
      <span>Cerrar sesión</span>
    </Button>
  );
}

/** Sidebar + mobile nav only. Page content must live outside this component (Astro slot). */
export function AdminShell({ active, navItems, staffProfile, authConfigured }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="admin-mobile-header fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </Button>
        <a href="/admin" className="min-w-0 flex-1 px-3">
          <p className="truncate text-sm font-bold text-foreground">FARECOH Admin</p>
        </a>
        <div className="flex items-center gap-2">
          {staffProfile && (
            <Badge variant="outline" className="max-w-[7rem] truncate text-xs">
              {ROLE_LABELS[staffProfile.role]}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => void signOutAndRedirect(authConfigured)} aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:bg-card">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-6 flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base shadow-xs">
              F
            </div>
            <div>
              <a href="/admin" aria-label="Panel administrativo">
                <p className="text-base font-bold tracking-tight text-foreground">FARECOH</p>
              </a>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Panel Operativo</p>
            </div>
          </div>

          {staffProfile && <ProfileCard staffProfile={staffProfile} />}
          <NavLinks items={navItems} active={active} />
          <LogoutButton authConfigured={authConfigured} className="mt-4" />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(88vw,20rem)] p-4">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-base font-bold">FARECOH Admin</SheetTitle>
          </SheetHeader>
          {staffProfile && <ProfileCard staffProfile={staffProfile} />}
          <NavLinks items={navItems} active={active} onNavigate={() => setMobileOpen(false)} />
          <Separator className="my-4" />
          <LogoutButton authConfigured={authConfigured} />
        </SheetContent>
      </Sheet>
    </>
  );
}
