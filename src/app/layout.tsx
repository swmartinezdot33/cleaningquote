import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { TrackingScripts } from "@/components/TrackingScripts"
import { MetaPixel } from "@/components/MetaPixel"
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

interface TrackingCodes {
  customHeadCode?: string;
}

async function getLayoutData(): Promise<{ googleMapsApiKey: string; trackingCodes: TrackingCodes }> {
  let googleMapsApiKey = ""
  let trackingCodes: TrackingCodes = {}
  try {
    const { getGoogleMapsKey, getTrackingCodes } = await import("@/lib/kv")
    const [apiKey, codes] = await Promise.all([
      getGoogleMapsKey(),
      getTrackingCodes(),
    ])
    googleMapsApiKey = apiKey || ""
    trackingCodes = codes || {}
  } catch (error) {
    console.error("Layout: failed to load config (Google Maps key / tracking):", error)
  }
  return { googleMapsApiKey, trackingCodes }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { googleMapsApiKey, trackingCodes } = await getLayoutData()

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
        {/* Google Maps API with Places library - required for autocomplete and geocoding */}
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`}
            async
            defer
          />
        )}
        {/* CleanQuote external tracking */}
        <script
          src="https://go.cleanquote.io/js/external-tracking.js"
          data-tracking-id="tk_63f96666ce01464597d79e5c982bed15"
          async
        />
      </head>
      <body className={font.className}>
        {/* Meta Pixel: only on allowed frontend pages (no dashboard, quote tool, or customer data) */}
        <MetaPixel />
        {/* Tracking scripts - EXCLUDED on admin pages */}
        <TrackingScripts trackingCodes={trackingCodes} />
        {children}
      </body>
    </html>
  )
}
