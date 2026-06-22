import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { APIContext } from "astro";

export type StaffRole = "super_admin" | "event_manager" | "seller" | "checkin_operator";

export interface StaffProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
}

export function isAuthConfigured(): boolean {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseEnv() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required for admin auth.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super admin",
  event_manager: "Gestor de evento",
  seller: "Vendedor",
  checkin_operator: "Operador check-in",
};

export function createDevStaffProfile(): StaffProfile {
  return {
    id: "dev-profile",
    user_id: "dev-user",
    email: "dev@farecoh.local",
    full_name: "Dev Admin",
    role: "super_admin",
    active: true,
    created_at: new Date().toISOString(),
  };
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function createSupabaseServerClient(context: APIContext) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return context.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });
}
