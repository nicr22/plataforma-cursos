/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Deshabilitar ESLint durante build en producción
    ignoreDuringBuilds: true,
  },
  typescript: {
    // También deshabilitar errores de TypeScript en build
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig