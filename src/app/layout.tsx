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
        {/* Critical baseline so iframe and local dev have styles even if main CSS is delayed or blocked */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{
            --background:0 0% 100%;--foreground:222.2 84% 4.9%;--card:0 0% 100%;--card-foreground:222.2 84% 4.9%;
            --primary:270 65% 55%;--primary-foreground:0 0% 100%;--muted:210 40% 96.1%;--muted-foreground:215.4 16.3% 46.9%;
            --border:214.3 31.8% 91.4%;--input:214.3 31.8% 91.4%;--ring:270 65% 55%;--radius:0.25rem;--primary-color:#7c3aed
          }
          *,*::before,*::after{box-sizing:border-box}
          html{font-family:var(--font-sans,ui-sans-serif,system-ui,sans-serif);line-height:1.5;-webkit-text-size-adjust:100%}
          body{margin:0;min-height:100vh;background-color:hsl(var(--background));color:hsl(var(--foreground))}
          a{color:var(--primary-color,#7c3aed);text-decoration:none}
          a:hover{text-decoration:underline}
          .dashboard-header a:hover{text-decoration:none}
          .dashboard-root a,.dashboard-root a:hover{text-decoration:none}
          button,input,select,textarea{font:inherit;color:inherit}
          button{cursor:pointer}
          input,select,textarea{border:1px solid hsl(var(--border));border-radius:var(--radius);padding:0.5rem 0.75rem;background:hsl(var(--background));width:100%}
          .rounded-lg{border-radius:0.5rem}.rounded-md{border-radius:0.375rem}.rounded-xl{border-radius:0.75rem}
          .border{border-width:1px;border-style:solid;border-color:hsl(var(--border))}
          .bg-white{background-color:#fff}.bg-card{background-color:hsl(var(--card))}.bg-muted\\/30{background-color:hsl(var(--muted) / 0.3)}
          .bg-background{background-color:hsl(var(--background))}.text-foreground{color:hsl(var(--foreground))}.text-muted-foreground{color:hsl(var(--muted-foreground))}
          .shadow-sm{box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05)}.shadow-md{box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1),0 2px 4px -2px rgb(0 0 0 / 0.1)}
          .p-4{padding:1rem}.p-5{padding:1.25rem}.px-4{padding-left:1rem;padding-right:1rem}.py-2{padding-top:0.5rem;padding-bottom:0.5rem}.py-8{padding-top:2rem;padding-bottom:2rem}
          .mb-2{margin-bottom:0.5rem}.mb-4{margin-bottom:1rem}.mt-2{margin-top:0.5rem}.space-y-5 > * + *{margin-top:1.25rem}
          .text-sm{font-size:0.875rem;line-height:1.25rem}.text-xs{font-size:0.75rem;line-height:1rem}.text-xl{font-size:1.25rem;line-height:1.75rem}
          .font-medium{font-weight:500}.font-semibold{font-weight:600}.block{display:block}.w-full{width:100%}.max-w-920px{max-width:920px}.mx-auto{margin-left:auto;margin-right:auto}
          .min-h-screen{min-height:100vh}
        ` }} />
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
