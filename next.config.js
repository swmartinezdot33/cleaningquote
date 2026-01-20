const { join } = require('path');
const { copyFileSync, existsSync, mkdirSync } = require('fs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Copy Excel file to .next/server during build for serverless functions
    if (isServer) {
      const dataDir = join(process.cwd(), 'data');
      const excelFile = join(dataDir, '2026 Pricing.xlsx');
      
      if (existsSync(excelFile)) {
        const nextDataDir = join(process.cwd(), '.next', 'server', 'data');
        if (!existsSync(nextDataDir)) {
          mkdirSync(nextDataDir, { recursive: true });
        }
        const destFile = join(nextDataDir, '2026 Pricing.xlsx');
        copyFileSync(excelFile, destFile);
        console.log(`Copied Excel file to: ${destFile}`);
      }
    }
    return config;
  },
}

module.exports = nextConfig
