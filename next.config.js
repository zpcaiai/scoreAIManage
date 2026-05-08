/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use default Node.js server to support API routes
  // output: 'export' is removed
  // distDir: 'out' is removed
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig
