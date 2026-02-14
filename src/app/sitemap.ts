import type { MetadataRoute } from "next"
import { CANONICAL_SITE_URL } from "@/lib/canonical-url"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/llms.txt",
    "/ai.txt",
    "/terms",
    "/privacy",
    "/help",
    "/help/getting-started",
    "/help/google-maps-api",
    "/help/ghl-integration",
    "/help/ghl-config",
    "/help/ghl-custom-menu-link",
    "/help/ghl-sidebar-custom-js",
    "/help/service-area-polygon",
    "/help/survey-builder",
    "/help/pricing-structure-builder",
    "/help/custom-domain",
    "/login",
    "/signup",
    "/subscribe",
  ]

  return routes.map((path) => {
    const isHelp = path === "/help" || path.startsWith("/help/");
    const isKeyPublic = path === "/terms" || path === "/privacy";
    const priority = path === "" ? 1 : (isHelp || isKeyPublic ? 0.9 : 0.8);
    return {
      url: `${CANONICAL_SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? "weekly" : ("monthly" as const),
      priority,
    };
  })
}
