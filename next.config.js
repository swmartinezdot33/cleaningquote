/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Serve favicon/icon via API so it's not blocked by Vercel Deployment Protection when possible
  async rewrites() {
    return [
      { source: '/cleanquote_square_icon_padding.png', destination: '/api/icon' },
    ];
  },

  // Faster builds: skip ESLint during build (run "next lint" in CI or pre-commit)
  eslint: { ignoreDuringBuilds: true },

  // Only bundle icons/components actually imported (faster compile + smaller bundles)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-progress',
    ],
  },

  // Security headers (exclude /_next so Next can serve static chunks without our headers affecting behavior)
  async headers() {
    return [
      {
        source: '/scripts/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/((?!_next).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Allow embedding in iframes (e.g. GHL custom menu). CSP frame-ancestors
          // overrides X-Frame-Options when present; * allows GHL and any parent.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
