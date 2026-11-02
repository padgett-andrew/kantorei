/// <reference path="../.astro/types.d.ts" />

import type { Singer } from './types/choir';

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<Record<string, string | undefined>>;

declare global {
  namespace App {
    interface Locals extends CloudflareRuntime {
      singer?: Singer;
      isDevPreview?: boolean;
    }
  }
}

export {};
