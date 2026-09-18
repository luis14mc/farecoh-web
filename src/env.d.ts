/// <reference types="astro/client" />
/// <reference types="@astrojs/react/client" />

import type { UserProfile } from "@/lib/auth";

declare namespace App {
  interface Locals {
    staffProfile?: UserProfile;
  }
}

interface ImportMetaEnv {
  readonly DATABASE_URL?: string;
  readonly AUTH_SECRET?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly DEBUG_PRINT_LAYOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*?arrayBuffer" {
  const value: ArrayBuffer;
  export default value;
}