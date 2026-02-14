import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MarketingPage from "./MarketingPage";
import CustomDomainRootPage from "./CustomDomainRootPage";
import {
  isOwnAppDomain,
  isHostCustomDomain,
  getOrgIdForCustomDomainHost,
} from "@/lib/custom-domain";
import { getGHLLocationIdForOrg } from "@/lib/config/store";
import { getOrFetchTokenForLocation } from "@/lib/ghl/token-store";
import { getLocationWithToken } from "@/lib/ghl/client";

export const dynamic = "force-dynamic";

const marketingMetadata: Metadata = {
  title: "Sales Solution for Cleaning Companies | Instant Quotes — CleanQuote.io",
  description:
    "CleanQuote.io is a sales solution with a web application: custom quote forms, instant pricing, and optional CRM sync for cleaning companies. Close more leads—try free for 14 days. No software to download.",
  openGraph: {
    title: "Sales Solution for Cleaning Companies | Instant Quotes — CleanQuote.io",
    description:
      "CleanQuote.io is a sales solution with a web application: custom quote forms, instant pricing, and optional CRM sync for cleaning companies. Close more leads—try free for 14 days.",
  },
};

/** On client custom domains at / we show an unbranded page and hide our product name from metadata. */
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  if (isOwnAppDomain(host)) return marketingMetadata;
  if (await isHostCustomDomain(host)) {
    return {
      title: { absolute: "Page not available" },
      robots: "noindex, nofollow",
    };
  }
  return marketingMetadata;
}

/** Ensure URL is safe to redirect to (http or https, no javascript: etc.). */
function isValidRedirectUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  if (isOwnAppDomain(host)) {
    return <MarketingPage />;
  }

  if (await isHostCustomDomain(host)) {
    const orgId = await getOrgIdForCustomDomainHost(host);
    const ghlLocationId = orgId ? await getGHLLocationIdForOrg(orgId) : null;
    const token = ghlLocationId ? await getOrFetchTokenForLocation(ghlLocationId) : null;
    const location = token && ghlLocationId ? await getLocationWithToken(ghlLocationId, token) : null;
    const website = location?.business?.website?.trim();
    if (website && isValidRedirectUrl(website)) {
      redirect(website);
    }
    return <CustomDomainRootPage />;
  }

  return <MarketingPage />;
}
