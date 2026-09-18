// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://farecoh.org",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: true,
    port: Number(process.env.PORT) || 4321,
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});