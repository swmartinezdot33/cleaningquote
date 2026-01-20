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

  return (
    <html lang="en">
      <head>
        {/* Google Maps API - required for address autocomplete */}
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
            async
            defer
          />
        )}
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
