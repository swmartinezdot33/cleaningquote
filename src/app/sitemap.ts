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
    "/help/google-maps-api",
    "/help/ghl-integration",
    "/help/ghl-config",
    "/help/service-area-polygon",
    "/help/survey-builder",
    "/help/pricing-structure-builder",
    "/help/custom-domain",
    "/login",
    "/signup",
  ]

  return routes.map((path) => ({
    url: `${CANONICAL_SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : ("monthly" as const),
    priority: path === "" ? 1 : 0.8,
  }))
}
