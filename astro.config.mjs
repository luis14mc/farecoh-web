// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://farecoh.org",
  output: "server",
  adapter: node({ mode: "standalone", staticHeaders: true }),
  integrations: [react()],
  server: {
    host: true,
    port: Number(process.env.PORT ?? 4321),
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@lucide/astro"],
    },
    build: {
      cssMinify: "lightningcss",
    },
  },
  build: {
    assets: "_astro",
    inlineStylesheets: "auto",
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  experimental: {
    clientPrerender: true,
  },
});
