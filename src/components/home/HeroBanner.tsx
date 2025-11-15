'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Award, Play } from 'lucide-react'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string | null
  button_text: string
  button_link: string | null
  link_type: 'course' | 'external' | 'none'
  background_color: string
  gradient_from: string
  gradient_to: string
  text_color: string
  priority: number
}

interface HeroBannerProps {
  lastViewedCourse?: {
    id: string
    title: string
    description: string | null
    thumbnail_url: string | null
    progress?: number
  } | null
}

export default function HeroBanner({ lastViewedCourse }: HeroBannerProps) {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch banners from Supabase
  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      if (error) {
        // Si la tabla no existe, usar banners por defecto
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setBanners([])
          setLoading(false)
          return
        }
        throw error
      }

      // Filtrar banners por fecha
      const now = new Date()
      const activeBanners = (data || []).filter(banner => {
        const startDate = banner.start_date ? new Date(banner.start_date) : null
        const endDate = banner.end_date ? new Date(banner.end_date) : null

        if (startDate && startDate > now) return false
        if (endDate && endDate < now) return false

        return true
      })

      setBanners(activeBanners)
    } catch (error) {
      console.error('Error fetching banners:', error)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused || banners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000) // Cambiar cada 5 segundos

    return () => clearInterval(interval)
  }, [banners.length, isPaused])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }, [banners.length])

  const handleBannerClick = (banner: Banner) => {
    if (!banner.button_link) return

    if (banner.link_type === 'course') {
      router.push(`/course/${banner.button_link}`)
    } else if (banner.link_type === 'external') {
      router.push(banner.button_link)
    }
  }

  // Si hay curso visto recientemente, mostrarlo primero
  if (lastViewedCourse && banners.length === 0 && !loading) {
    return (
      <div className="relative h-[70vh] rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>

        {/* Background */}
        <div className="absolute inset-0">
          {lastViewedCourse.thumbnail_url ? (
            <img
              src={lastViewedCourse.thumbnail_url}
              alt={lastViewedCourse.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-20 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-8 w-full">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Continúa donde lo dejaste</span>
              </div>

              <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                {lastViewedCourse.title}
              </h1>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                {lastViewedCourse.description || 'Continúa tu aprendizaje y alcanza tus metas.'}
              </p>

              {lastViewedCourse.progress !== undefined && (
                <div className="mb-8">
                  <div className="flex items-center justify-between text-white mb-2">
                    <span className="text-sm">Progreso del curso</span>
                    <span className="text-sm font-bold">{lastViewedCourse.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                      style={{ width: `${lastViewedCourse.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={() => router.push(`/course/${lastViewedCourse.id}`)}
                className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-200 shadow-lg hover:scale-105"
              >
                <Play className="w-6 h-6 fill-current" />
                Continuar Curso
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay banners y no hay curso visto, no mostrar nada
  if (banners.length === 0 && !loading) {
    return null
  }

  if (loading) {
    return (
      <div className="relative h-[70vh] rounded-2xl overflow-hidden bg-gray-800 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Cargando...</div>
        </div>
      </div>
    )
  }

  const currentBanner = banners[currentIndex]

  return (
    <div
      className="relative h-[70vh] rounded-2xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background con gradiente o imagen */}
      <div className="absolute inset-0">
        {currentBanner.image_url ? (
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${currentBanner.gradient_from}, ${currentBanner.gradient_to})`
            }}
          ></div>
        )}
      </div>

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>

      {/* Content */}
      <div className="relative z-20 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="max-w-2xl">
            {currentBanner.subtitle && (
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-yellow-400" />
                <span
                  className="font-semibold text-lg"
                  style={{ color: currentBanner.text_color }}
                >
                  {currentBanner.subtitle}
                </span>
              </div>
            )}

            <h1
              className="text-6xl font-bold mb-6 leading-tight"
              style={{ color: currentBanner.text_color }}
            >
              {currentBanner.title}
            </h1>

            {currentBanner.description && (
              <p
                className="text-xl mb-8 leading-relaxed opacity-90"
                style={{ color: currentBanner.text_color }}
              >
                {currentBanner.description}
              </p>
            )}

            {currentBanner.link_type !== 'none' && currentBanner.button_link && (
              <button
                onClick={() => handleBannerClick(currentBanner)}
                className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-200 shadow-lg hover:scale-105"
              >
                <Play className="w-6 h-6 fill-current" />
                {currentBanner.button_text}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Solo si hay más de un banner */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Siguiente banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators - Solo si hay más de un banner */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Ir al banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
