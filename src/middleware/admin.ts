import type { APIContext } from "astro";
import { createSupabaseServerClient, type UserProfile, type StaffRole } from "@/lib/auth";
import type { Database } from "@/types/database";

export async function getStaffProfile(context: APIContext): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, full_name, role_id, active, created_at, roles(name)")
    .eq("auth_user_id", userData.user.id)
    .eq("active", true)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    email: data.email,
    full_name: data.full_name,
    role_id: data.role_id,
    role: data.roles?.name as StaffRole,
    active: data.active,
    created_at: data.created_at,
  } as UserProfile;
}

export async function isAdminSession(context: APIContext): Promise<boolean> {
  const profile = await getStaffProfile(context);
  return profile !== null;
}

export function requireAdminResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;
export type { Database };
