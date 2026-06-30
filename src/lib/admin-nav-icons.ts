import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScanLine,
  Shield,
  Ticket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminNavKey } from "@/lib/admin-nav";

export const ADMIN_NAV_ICONS: Record<AdminNavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Shield,
  sales: CreditCard,
  tickets: Ticket,
  batches: Package,
  checkin: ScanLine,
  vendors: Users,
  reports: BarChart3,
};

export { Menu, LogOut };
