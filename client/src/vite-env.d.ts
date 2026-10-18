/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Express API including /api/v1. Defaults to "/api/v1" (same-origin / dev proxy / Netlify proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Public URL of this site (no trailing slash). Used for canonical/OG tags and the sitemap at build time. */
  readonly VITE_SITE_URL?: string;
  /** Cloudflare Turnstile site key (public). Leave empty to disable the CAPTCHA. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
