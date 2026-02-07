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
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'page.tsx:HomePage', message: 'HomePage rendering', data: {}, timestamp: Date.now() }) }).catch(() => {});
  return <MarketingPage />;
}
