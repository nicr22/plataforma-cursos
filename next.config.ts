/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Deshabilitar generación estática para páginas problemáticas
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Forzar todas las páginas a ser dinámicas
  output: 'standalone'
}

module.exports = nextConfig