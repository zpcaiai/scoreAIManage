/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export in production
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'out',
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
