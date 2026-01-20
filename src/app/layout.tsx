import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { kv } from "@vercel/kv"

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
  } catch (error) {
    console.error("Failed to load tracking codes:", error)
  }

  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        {trackingCodes.googleAnalyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${trackingCodes.googleAnalyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${trackingCodes.googleAnalyticsId}');
                `,
              }}
            />
          </>
        )}

        {/* Google Tag Manager */}
        {trackingCodes.googleTagManagerId && (
          <script
            async
            src={`https://www.googletagmanager.com/gtm.js?id=${trackingCodes.googleTagManagerId}`}
          />
        )}

        {/* Meta Pixel / Facebook Pixel */}
        {trackingCodes.metaPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${trackingCodes.metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}

        {/* Custom Head Code */}
        {trackingCodes.customHeadCode && (
          <script
            dangerouslySetInnerHTML={{
              __html: trackingCodes.customHeadCode,
            }}
          />
        )}

        {/* Google Maps API with Places library - required for autocomplete and geocoding */}
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`}
            async
            defer
          />
        )}
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
