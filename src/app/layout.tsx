import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { kv } from "@vercel/kv"
import { TrackingScripts } from "@/components/TrackingScripts"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cleaning Quote Calculator",
  description: "Residential cleaning company pricing calculator",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

interface TrackingCodes {
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  metaPixelId?: string;
  customHeadCode?: string;
  googleAdsConversionId?: string;
  googleAdsConversionLabel?: string;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get Google Maps API key from KV storage
  let googleMapsApiKey = ""
  try {
    const apiKey = await kv.get<string>("admin:google-maps-api-key")
    googleMapsApiKey = apiKey || ""
  } catch (error) {
    console.error("Failed to load Google Maps API key:", error)
  }

  // Get tracking codes from KV storage
  let trackingCodes: TrackingCodes = {}
  try {
    const codes = await kv.get<TrackingCodes>("admin:tracking-codes")
    trackingCodes = codes || {}
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && Object.keys(trackingCodes).length > 0) {
      console.log('📊 Tracking codes loaded from KV:', {
        hasGA: !!trackingCodes.googleAnalyticsId,
        hasGTM: !!trackingCodes.googleTagManagerId,
        hasMetaPixel: !!trackingCodes.metaPixelId,
        hasGAds: !!trackingCodes.googleAdsConversionId,
        hasCustomCode: !!trackingCodes.customHeadCode,
      });
    }
  } catch (error) {
    console.error("Failed to load tracking codes:", error)
  }

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
      </head>
      <body className={inter.className}>
        {/* Tracking scripts - EXCLUDED on admin pages */}
        <TrackingScripts trackingCodes={trackingCodes} />
        {children}
      </body>
    </html>
  )
}
