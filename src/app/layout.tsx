import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import LoadingTransition from '@/components/LoadingTransition'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EduPlatform',
  description: 'Accede a tus cursos comprados',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 via-black to-gray-900`} suppressHydrationWarning>
        <LoadingTransition />
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}