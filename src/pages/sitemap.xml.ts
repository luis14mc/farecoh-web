import type { APIRoute } from "astro";
import { buildSitemapXml } from "@/lib/seo";
import { eventImage } from "@/data/seo";
import { listPublicEvents } from "@/services/public-events";

export const GET: APIRoute = async () => {
  const lastmod = new Date().toISOString().split("T")[0];
  const events = await listPublicEvents();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(new Date());
  const body = buildSitemapXml(
    lastmod,
    events.map((event) => ({
      path: `/eventos/${encodeURIComponent(event.slug)}`,
      changefreq: event.event_date >= today ? ("weekly" as const) : ("monthly" as const),
      priority: event.event_date >= today ? "0.8" : "0.4",
      lastmod: event.updated_at ? new Date(event.updated_at).toISOString().split("T")[0] : lastmod,
      image: eventImage(event),
    })),
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
