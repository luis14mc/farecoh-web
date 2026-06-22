import type { APIContext } from "astro";
import { createSupabaseServerClient, type StaffProfile } from "@/lib/auth";
import type { Database } from "@/types/database";

export async function getStaffProfile(context: APIContext): Promise<StaffProfile | null> {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id, user_id, email, full_name, role, active, created_at")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .single();

  if (error || !data) return null;
  return data as StaffProfile;
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
