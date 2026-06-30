export type AdminNavKey =
  | "dashboard"
  | "users"
  | "sales"
  | "tickets"
  | "batches"
  | "checkin"
  | "vendors"
  | "reports"
  | "printing";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  key: AdminNavKey;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Panel", href: "/admin", icon: "dashboard", key: "dashboard" },
  { label: "Usuarios", href: "/admin/users", icon: "admin_panel_settings", key: "users" },
  { label: "Ventas", href: "/admin/sales", icon: "payments", key: "sales" },
  { label: "Boletos", href: "/admin/tickets", icon: "confirmation_number", key: "tickets" },
  { label: "Lotes", href: "/admin/batches", icon: "inventory_2", key: "batches" },
  { label: "Acceso", href: "/admin/checkin", icon: "qr_code_scanner", key: "checkin" },
  { label: "Vendedores", href: "/admin/vendors", icon: "group", key: "vendors" },
  { label: "Reportes", href: "/admin/reports", icon: "monitoring", key: "reports" },
  { label: "Impresión", href: "/admin/printing", icon: "print", key: "printing" },
];
