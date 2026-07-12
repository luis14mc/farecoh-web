import {
  BarChart3,
  Bookmark,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Printer,
  ScanLine,
  Send,
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
  reservations: Bookmark,
  tickets: Ticket,
  delivery: Send,
  batches: Package,
  checkin: ScanLine,
  vendors: Users,
  reports: BarChart3,
  printing: Printer,
};

export { Menu, LogOut };
