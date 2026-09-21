// @ts-check
/**
 * @typedef {import("node:http").IncomingMessage} IncomingMessage
 * @typedef {import("node:http").ServerResponse} ServerResponse
 */

import http from "node:http";

process.env.ASTRO_NODE_AUTOSTART = "disabled";

const { handler } = await import("./dist/server/entry.mjs");

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const SHUTDOWN_TIMEOUT_MS = 10_000;

const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_HOUR = 60 * 60;

/**
 * @type {Array<{ pattern: RegExp; value: string }>}
 */
const STATIC_CACHE_RULES = [
  { pattern: /^\/_astro\/|^\/fonts\/|\.[a-z0-9]{8,}\.(webp|avif|png|jpg|jpeg|svg|woff2?)$/i, value: `public, max-age=${ONE_YEAR}, immutable` },
  { pattern: /^\/(sitemap\.xml|robots\.txt|favicon\.ico|manifest\.webmanifest)$/i, value: `public, max-age=${ONE_HOUR}, s-maxage=${ONE_HOUR}` },
];

/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
const resolveCacheControl = (url) => {
  for (const rule of STATIC_CACHE_RULES) {
    if (rule.pattern.test(url ?? "")) return rule.value;
  }
  return null;
};

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
const patchResForStaticAssets = (req, res) => {
  if (res.__patched) return;
  res.__patched = true;
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function patchedSetHeader(name, value) {
    if (typeof name === "string" && name.toLowerCase() === "cache-control") {
      const override = resolveCacheControl(req.url);
      if (override) value = override;
    }
    return originalSetHeader(name, value);
  };
};

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
const adapter = (req, res) => {
  res.setHeader("X-Powered-By", "Astro");
  patchResForStaticAssets(req, res);
  handler(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end("Not Found");
    }
  });
};

const server = http.createServer(adapter);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 60_000;

/**
 * @param {NodeJS.Signals | string} signal
 */
const shutdown = (signal) => {
  console.log(`[server] received ${signal}, shutting down`);
  const timer = setTimeout(() => {
    console.error("[server] forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  server.close(() => {
    clearTimeout(timer);
    console.log("[server] closed cleanly");
    process.exit(0);
  });
};

server.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] uncaughtException", err);
  shutdown("uncaughtException");
});
