import type { APIContext } from "astro";
import { getStaffProfile, type UserProfile, type StaffRole } from "@/lib/auth";

export { getStaffProfile, type UserProfile, type StaffRole };

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
