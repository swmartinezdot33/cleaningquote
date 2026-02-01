import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ToolScopedTracking } from "@/components/ToolScopedTracking"
import { MetaPixel } from "@/components/MetaPixel"
import { MapsScriptLoader } from "@/components/MapsScriptLoader"
import { CANONICAL_SITE_URL } from "@/lib/canonical-url"

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })

/** Canonical domain for SEO and social (always https://www.cleanquote.io). */
const siteUrl = CANONICAL_SITE_URL
const defaultTitle = "Cleaning Quote Software | CleanQuote.io — Instant Quotes for Cleaning Companies"
const defaultDescription =
  "CleanQuote.io is cleaning quote software that gives cleaning companies custom quote forms, instant pricing, and HighLevel sync. Close more leads with cleaning quote software built for residential and commercial cleaners."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | CleanQuote.io",
  },
  description: defaultDescription,
  keywords: [
    "cleaning quote software",
    "cleaning company software",
    "cleaning quote tool",
    "instant quote for cleaning",
    "cleaning business software",
    "quote form for cleaning company",
    "HighLevel cleaning",
    "cleaning company CRM",
    "residential cleaning software",
    "commercial cleaning quote",
    "cleaning service quote tool",
    "online quote software cleaning",
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

// No global keys or analytics: each tool uses its own (Maps + tracking loaded per-tool on /t/[slug]).
async function getLayoutData(): Promise<{ googleMapsApiKey: string }> {
  let googleMapsApiKey = ""
  try {
    const { getGoogleMapsKey } = await import("@/lib/kv")
    const apiKey = await getGoogleMapsKey(undefined)
    googleMapsApiKey = apiKey || ""
  } catch (error) {
    console.error("Layout: failed to load config:", error)
  }
  return { googleMapsApiKey }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        description: "Cleaning quote software for cleaning companies. Custom quote forms, instant pricing, HighLevel integration, and embeddable widgets for residential and commercial cleaning businesses.",
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
        {/* Tool-scoped tracking only (no global analytics) */}
        <ToolScopedTracking />
        {children}
      </body>
    </html>
  )
}
