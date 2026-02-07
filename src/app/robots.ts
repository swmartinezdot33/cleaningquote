import type { MetadataRoute } from "next"
import { CANONICAL_SITE_URL } from "@/lib/canonical-url"

/**
 * Served at /robots.txt.
 * LLM/AI crawler files: /llms.txt (full doc), /ai.txt (pointer to llms.txt). Both are under allow: "/".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/auth/",
          "/quote-flow",
          "/t/", // tenant quote tools (dynamic, session-heavy)
          "/quote/", // individual quote results (private)
          "/invite/",
          "/subscribe/",
          "/out-of-service/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/auth/",
          "/quote-flow",
          "/t/",
          "/quote/",
          "/invite/",
          "/subscribe/",
          "/out-of-service/",
        ],
      },
    ],
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
    host: CANONICAL_SITE_URL,
  }
}
