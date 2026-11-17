import type { APIRoute } from "astro";
import { buildSitemapXml } from "@/lib/seo";

import { listPublicEvents } from "@/services/public-events";

export const GET: APIRoute = async () => {
  const lastmod = new Date().toISOString().split("T")[0];
  const events = await listPublicEvents();
  const body = buildSitemapXml(lastmod, [
    { path: "/eventos", changefreq: "weekly", priority: "0.8" },
    ...events.map(({ slug }) => ({ path: `/eventos/${encodeURIComponent(slug)}`, changefreq: "weekly" as const, priority: "0.7" })),
  ]);

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
