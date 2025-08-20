import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // NO incluir output: 'export' para Vercel
  images: {
    unoptimized: true
  }
}

export default nextConfig