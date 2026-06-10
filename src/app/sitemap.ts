import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "https://observerai.app";

/**
 * Public, indexable routes only. Do not list /dashboard, /settings, /connect,
 * etc., those are gated. /showcase is intentionally listed because it's a
 * marketing demo page (gate is being removed in Phase 5).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`,             lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE_URL}/pricing`,      lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/showcase`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`,        lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${SITE_URL}/signup`,       lastModified: now, changeFrequency: "yearly",  priority: 0.7 },
    { url: `${SITE_URL}/privacy`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/terms`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
