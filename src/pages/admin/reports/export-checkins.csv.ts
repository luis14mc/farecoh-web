import type { APIRoute } from "astro";
import { createSupabaseServerClient, exportCsvResponse } from "@/lib/admin-export";

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);

  const { data: checkins = [], error } = await supabase
    .from("checkins")
    .select("validated_by, validated_at, ticket:tickets(ticket_code, buyer_name)")
    .order("validated_at", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = checkins.map((row) => {
    const ticket = row.ticket as { ticket_code?: string; buyer_name?: string | null } | null;
    return [
      ticket?.ticket_code ?? "",
      ticket?.buyer_name ?? "",
      row.validated_by,
      row.validated_at,
    ];
  });

  return exportCsvResponse(context, "checkins.csv", [
    "ticket_code",
    "buyer_name",
    "validated_by",
    "validated_at",
  ], rows);
};
