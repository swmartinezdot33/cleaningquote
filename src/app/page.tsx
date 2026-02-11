import type { Metadata } from "next";
import MarketingPage from "./MarketingPage";

/** SEO: home page targets quote solution and sales solution for cleaning companies. */
export const metadata: Metadata = {
  title: "Sales Solution for Cleaning Companies | Instant Quotes — CleanQuote.io",
  description:
    "CleanQuote.io is a sales solution with a web application: custom quote forms, instant pricing, and optional CRM sync for cleaning companies. Close more leads—try free for 14 days. No software to download.",
  openGraph: {
    title: "Sales Solution for Cleaning Companies | Instant Quotes — CleanQuote.io",
    description:
      "CleanQuote.io is a sales solution with a web application: custom quote forms, instant pricing, and optional CRM sync for cleaning companies. Close more leads—try free for 14 days.",
  },
};

export default function HomePage() {
  return <MarketingPage />;
}
