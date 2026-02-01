import type { Metadata } from "next";
import MarketingPage from "./MarketingPage";

/** SEO: home page targets "cleaning quote software" and related terms. */
export const metadata: Metadata = {
  title: "Cleaning Quote Software | Instant Quotes for Cleaning Companies",
  description:
    "CleanQuote.io is cleaning quote software that gives cleaning companies custom quote forms, instant pricing, and HighLevel sync. Close more leads—try free for 14 days.",
  openGraph: {
    title: "Cleaning Quote Software | Instant Quotes for Cleaning Companies",
    description:
      "CleanQuote.io is cleaning quote software that gives cleaning companies custom quote forms, instant pricing, and HighLevel sync. Close more leads—try free for 14 days.",
  },
};

export default function HomePage() {
  return <MarketingPage />;
}
