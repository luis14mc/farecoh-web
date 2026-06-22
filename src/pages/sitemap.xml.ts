import type { APIRoute } from "astro";
import { buildSitemapXml } from "@/lib/seo";

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().split("T")[0];
  const body = buildSitemapXml(lastmod);

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
