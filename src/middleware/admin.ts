import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function isAdminSession(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("id", authData.user.id)
    .single();

  return !error && Boolean(data);
}

export function requireAdminResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}