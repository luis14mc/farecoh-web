import type { APIContext } from "astro";
import { createSupabaseServerClient } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function exportCsvResponse(
  _context: APIContext,
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
): Promise<Response> {
  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export { createSupabaseServerClient };
