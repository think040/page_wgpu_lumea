import type { CollectionKey } from "@/lib/content/types";

export const CMA_BASE = "https://cma.weegloo.com/v1";
export const CDA_BASE = "https://cda.weegloo.com/v1";
export const UPLOAD_BASE = "https://upload.weegloo.com/v1";
export const CONSOLE_ORIGIN = "https://console.weegloo.com";

// NEXT_PUBLIC_* values are inlined at build time (static export has no runtime env).
export const SPACE_ID = process.env.NEXT_PUBLIC_WEEGLOO_SPACE_ID ?? "";
export const LOCALE = process.env.NEXT_PUBLIC_WEEGLOO_LOCALE || "ko-KR";
export const DELIVERY_TOKEN = process.env.NEXT_PUBLIC_WEEGLOO_DELIVERY_ACCESS_TOKEN ?? "";

export const CONTENT_TYPE_IDS: Record<"settings" | CollectionKey, string> = {
  settings: process.env.NEXT_PUBLIC_WEEGLOO_CT_SETTINGS ?? "",
  services: process.env.NEXT_PUBLIC_WEEGLOO_CT_SERVICE ?? "",
  projects: process.env.NEXT_PUBLIC_WEEGLOO_CT_PROJECT ?? "",
  process: process.env.NEXT_PUBLIC_WEEGLOO_CT_PROCESS ?? "",
  testimonials: process.env.NEXT_PUBLIC_WEEGLOO_CT_TESTIMONIAL ?? "",
};

/** Public pages read from Weegloo only when the space and a read token are configured. */
export const PUBLIC_WEEGLOO = Boolean(SPACE_ID && DELIVERY_TOKEN);

/** The admin writes to Weegloo when a space is configured; otherwise it runs in browser demo mode. */
export const ADMIN_WEEGLOO = Boolean(SPACE_ID);
