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

export interface PublicSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  return {
    supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function isAuthConfigured(config: PublicSupabaseConfig = getPublicSupabaseConfig()): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export function getSupabaseEnv(config: PublicSupabaseConfig = getPublicSupabaseConfig()) {
  const { supabaseUrl, supabaseAnonKey } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required for admin auth.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super administrador",
  event_manager: "Gestor de eventos",
  seller: "Vendedor",
  checkin_operator: "Operador de acceso",
};

export function createSupabaseBrowserClient(config?: PublicSupabaseConfig) {
  const { supabaseUrl, supabaseAnonKey } = config ?? getPublicSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;
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
