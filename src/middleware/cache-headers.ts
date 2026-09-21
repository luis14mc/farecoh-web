import { defineMiddleware } from "astro:middleware";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { Buffer } from "node:buffer";

const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_HOUR = 60 * 60;

const IMMUTABLE_ASSET_PATTERNS = [
  /^\/_astro\//,
  /^\/fonts\//,
];

const SHORT_CACHE_PATTERNS = [
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
];

const COMPRESSIBLE_CONTENT = /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/i;

const MIN_COMPRESS_BYTES = 512;

export const cacheHeaders = defineMiddleware(async (context, next) => {
  const response = await next();
  if (response.status >= 300 && response.status < 400) return response;
  if (context.url.pathname.startsWith("/api/")) return response;

  const { pathname } = context.url;
  const acceptEncoding = context.request.headers.get("accept-encoding") ?? "";

  if (IMMUTABLE_ASSET_PATTERNS.some((pattern) => pattern.test(pathname))) {
    response.headers.set("Cache-Control", `public, max-age=${ONE_YEAR}, immutable`);
  } else if (SHORT_CACHE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    response.headers.set("Cache-Control", `public, max-age=${ONE_HOUR}, s-maxage=${ONE_HOUR}`);
  } else if (pathname === "/health") {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const shouldCompress = acceptEncoding.includes("br")
    ? "br"
    : acceptEncoding.includes("gzip")
      ? "gzip"
      : null;

  if (!shouldCompress || !COMPRESSIBLE_CONTENT.test(contentType)) {
    return response;
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) < MIN_COMPRESS_BYTES) {
    return response;
  }

  if (response.headers.get("content-encoding")) {
    return response;
  }

  const body = await response.arrayBuffer();
  if (body.byteLength < MIN_COMPRESS_BYTES) {
    return response;
  }

  const compressed = shouldCompress === "br"
    ? brotliCompressSync(Buffer.from(body))
    : gzipSync(Buffer.from(body), { level: 6 });

  if (compressed.length >= body.byteLength) {
    return response;
  }

  response.headers.set("Content-Encoding", shouldCompress);
  response.headers.set("Content-Length", String(compressed.length));
  response.headers.append("Vary", "Accept-Encoding");

  return new Response(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
