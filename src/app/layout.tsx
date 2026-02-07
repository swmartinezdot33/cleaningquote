import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ToolScopedTracking } from "@/components/ToolScopedTracking"
import { MetaPixel } from "@/components/MetaPixel"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { MapsScriptLoader } from "@/components/MapsScriptLoader"
import { CANONICAL_SITE_URL } from "@/lib/canonical-url"

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })

/** Canonical domain for SEO and social (always https://www.cleanquote.io). */
const siteUrl = CANONICAL_SITE_URL
const defaultTitle = "Sales Solution for Cleaning Companies | CleanQuote.io — Instant Quotes"
const defaultDescription =
  "CleanQuote.io is a sales solution with a web application that gives cleaning companies custom quote forms, instant pricing, and optional CRM sync. Close more leads—no software to download, use in your browser."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | CleanQuote.io",
  },
  description: defaultDescription,
  keywords: [
    "cleaning quote solution",
    "sales solution cleaning companies",
    "cleaning quote tool",
    "instant quote for cleaning",
    "cleaning business quoting",
    "quote form for cleaning company",
    "cleaning sales",
    "cleaning company CRM",
    "residential cleaning quote",
    "commercial cleaning quote",
    "cleaning service quote tool",
    "online quote for cleaning",
  ],
  authors: [{ name: "CleanQuote", url: siteUrl }],
  creator: "CleanQuote",
  publisher: "CleanQuote",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CleanQuote.io",
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/cleanquote_square_logo_padding.png",
        width: 512,
        height: 512,
        alt: "CleanQuote — Smart quoting for cleaning companies",
      },
      {
        url: "/cleanquote_logo_long.png",
        width: 800,
        height: 200,
        alt: "CleanQuote.io",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/cleanquote_square_logo_padding.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/cleanquote_square_icon_padding.png", type: "image/png" },
    ],
    shortcut: "/cleanquote_square_icon_padding.png",
    apple: "/cleanquote_square_icon_padding.png",
  },
}

// Platform Google Maps key (env) used for all tools; no customer key required.
async function getLayoutData(): Promise<{ googleMapsApiKey: string }> {
  const platformKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || ''
  if (platformKey) return { googleMapsApiKey: platformKey }
  try {
    const { getGoogleMapsKey } = await import("@/lib/kv")
    const apiKey = await getGoogleMapsKey(undefined)
    return { googleMapsApiKey: apiKey || "" }
  } catch (error) {
    console.error("Layout: failed to load config:", error)
  }
  return { googleMapsApiKey: "" }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:RootLayout', message: 'RootLayout rendering', data: {}, timestamp: Date.now() }) }).catch(() => {});
  const { googleMapsApiKey } = await getLayoutData()

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "CleanQuote",
        url: siteUrl,
        logo: { "@type": "ImageObject", url: `${siteUrl}/cleanquote_square_logo_padding.png` },
        description: defaultDescription,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "CleanQuote.io",
        description: defaultDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/login` },
          "query-input": "required name=q",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "CleanQuote.io",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Sales solution for cleaning companies—web application for custom quote forms, instant pricing, optional CRM integration, and embeddable widgets. No download required.",
        url: siteUrl,
        offers: { "@type": "Offer", price: "297", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* CleanQuote external tracking */}
        <script
          src="https://go.cleanquote.io/js/external-tracking.js"
          data-tracking-id="tk_63f96666ce01464597d79e5c982bed15"
          async
        />
      </head>
      <body className={font.className}>
        {/* Google Maps: global key for non-tool routes; on /t/[slug] the loader fetches that tool's key */}
        <MapsScriptLoader globalKey={googleMapsApiKey} />
        {/* Meta Pixel: only on allowed frontend pages (no dashboard, quote tool, or customer data) */}
        <MetaPixel />
        {/* Google Analytics: CleanQuote.io marketing site (G-730E7ZJ7VD) */}
        <GoogleAnalytics />
        {/* Tool-scoped tracking only (no global analytics) */}
        <ToolScopedTracking />
        {children}
      </body>
    </html>
  )
}
