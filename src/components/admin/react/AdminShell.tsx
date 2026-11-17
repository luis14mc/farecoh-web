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
  dark = false,
}: {
  items: AdminNavItem[];
  active: AdminNavKey;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto py-2 pr-1" aria-label="Menú administrativo">
      {items.map((item) => {
        const Icon = ADMIN_NAV_ICONS[item.key];
        const isActive = active === item.key;
        return (
          <a
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc3f5]",
              dark
                ? isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
                : isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {isActive && (
              <span className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full", dark ? "bg-[#4fc3f5]" : "bg-primary")} />
            )}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                dark ? (isActive ? "text-[#4fc3f5]" : "text-white/45 group-hover:text-white/80") : isActive ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function ProfileCard({ staffProfile, dark = false }: { staffProfile: UserProfile; dark?: boolean }) {
  const initials = staffProfile.full_name
    ? staffProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-2.5", dark ? "bg-white/5" : "border bg-card")}>
      <Avatar className={cn("h-9 w-9", dark ? "ring-1 ring-white/15" : "border border-border")}>
        <AvatarFallback className={cn("text-xs font-bold", dark ? "bg-[#4fc3f5]/15 text-[#4fc3f5]" : "bg-primary/10 text-primary")}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", dark ? "text-white" : "text-foreground")}>{staffProfile.full_name}</p>
        <p className={cn("flex items-center gap-1.5 truncate text-[11px]", dark ? "text-white/50" : "text-muted-foreground")}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {ROLE_LABELS[staffProfile.role]}
        </p>
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

function LogoutButton({ authConfigured, className, dark = false }: { authConfigured: boolean; className?: string; dark?: boolean }) {
  return (
    <Button
      variant={dark ? "ghost" : "outline"}
      size="icon"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className={cn(
        "shrink-0",
        dark ? "text-white/50 hover:bg-white/10 hover:text-white" : "hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      onClick={() => void signOutAndRedirect(authConfigured)}
    >
      <LogOut className="h-4 w-4" />
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

      <aside className="admin-sidebar hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col px-3 py-5">
          <a href="/admin" aria-label="Panel administrativo" className="mb-7 flex items-center gap-3 px-2">
            <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-md" />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight text-white">FARECOH</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Boletería</p>
            </div>
          </a>

          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Operación</p>
          <NavLinks items={navItems} active={active} dark />

          <div className="mt-4 flex items-center gap-1 border-t border-white/10 pt-4">
            <div className="min-w-0 flex-1">{staffProfile && <ProfileCard staffProfile={staffProfile} dark />}</div>
            <LogoutButton authConfigured={authConfigured} dark />
          </div>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(88vw,20rem)] p-4">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-base font-bold">FARECOH Admin</SheetTitle>
          </SheetHeader>
          {staffProfile && <div className="mb-4"><ProfileCard staffProfile={staffProfile} /></div>}
          <NavLinks items={navItems} active={active} onNavigate={() => setMobileOpen(false)} />
          <Separator className="my-4" />
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => void signOutAndRedirect(authConfigured)}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
