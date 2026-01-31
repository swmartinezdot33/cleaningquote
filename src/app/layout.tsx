import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { TrackingScripts } from "@/components/TrackingScripts"
import { MetaPixel } from "@/components/MetaPixel"

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "CleanQuote.io",
  description: "CleanQuote.io — Smart quoting for cleaning companies. Build and embed custom quote forms.",
  icons: {
    icon: [
      { url: '/CleanQuote Logo Icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/CleanQuote Logo Icon.png',
    apple: '/CleanQuote Logo Icon.png',
  },
}

interface TrackingCodes {
  customHeadCode?: string;
}

async function getLayoutData(): Promise<{ googleMapsApiKey: string; trackingCodes: TrackingCodes }> {
  let googleMapsApiKey = ""
  let trackingCodes: TrackingCodes = {}
  try {
    const { kv } = await import("@vercel/kv")
    const [apiKey, codes] = await Promise.all([
      kv.get<string>("admin:google-maps-api-key"),
      kv.get<TrackingCodes>("admin:tracking-codes"),
    ])
    googleMapsApiKey = apiKey || ""
    trackingCodes = codes || {}
    if (process.env.NODE_ENV === 'development' && trackingCodes.customHeadCode) {
      console.log('📊 Custom head code loaded from KV (runs on quote summary page only)')
    }
  } catch (error) {
    console.error("Layout: failed to load KV (Google Maps key / tracking):", error)
  }
  return { googleMapsApiKey, trackingCodes }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { googleMapsApiKey, trackingCodes } = await getLayoutData()

  return (
    <html lang="en">
      <head>
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
