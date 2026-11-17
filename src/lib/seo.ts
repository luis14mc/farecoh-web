/** SEO helpers — canonical URLs, meta text, sitemap routes. */

export const DEFAULT_OG_IMAGE = "/images/farecoh-hero-orchestra.webp";

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
  lastmod?: string;
  image?: string;
};

/** Rutas públicas indexables (excluye admin, auth, API, consultas de boleto y eventos ocultos). */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0", image: "/images/og/farecoh-og.jpg" },
  { path: "/sobre-nosotros", changefreq: "monthly", priority: "0.8" },
  { path: "/programas", changefreq: "monthly", priority: "0.8" },
  { path: "/eventos", changefreq: "weekly", priority: "0.9" },
  { path: "/junta-directiva", changefreq: "monthly", priority: "0.5" },
  { path: "/alianzas", changefreq: "monthly", priority: "0.5" },
];

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildSitemapXml(lastmod: string, events: SitemapEntry[] = []): string {
  const urls = [...SITEMAP_ENTRIES, ...events].map((entry) => {
    const image = entry.image
      ? `\n    <image:image><image:loc>${escapeXml(entry.image.startsWith("http") ? entry.image : absoluteUrl(entry.image))}</image:loc></image:image>`
      : "";
    return `  <url>
    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>
    <lastmod>${entry.lastmod ?? lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${image}
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}
