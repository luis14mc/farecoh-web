/** SEO helpers — canonical URLs, meta text, sitemap routes. */

export const DEFAULT_OG_IMAGE = "/images/evento/hero.webp";

export function getSiteUrl(): string {
  const url = import.meta.env.PUBLIC_SITE_URL ?? "https://farecoh.org";
  return url.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export function canonicalFromPath(path: string): string {
  const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  return absoluteUrl(normalized || "/");
}

export function truncateDescription(text: string, maxLength = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export const ROBOTS_INDEX = "index, follow, max-image-preview:large, max-snippet:-1";
export const ROBOTS_NOINDEX = "noindex, nofollow";

export type SitemapEntry = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
};

/** Rutas públicas indexables (excluye admin, auth y consultas de boleto). */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/eventos/pink-floyd", changefreq: "weekly", priority: "0.9" },
  { path: "/eventos/pink-floyd/boletos", changefreq: "weekly", priority: "0.85" },
];

export function buildSitemapXml(lastmod: string): string {
  const urls = SITEMAP_ENTRIES.map(
    (entry) => `  <url>
    <loc>${absoluteUrl(entry.path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
