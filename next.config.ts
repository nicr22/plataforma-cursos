/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración para exportación estática (Netlify)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Quitar la configuración experimental problemática
  // experimental: {
  //   missingSuspenseWithCSRBailout: false,
  // },
}

module.exports = nextConfig