'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  Star,
  ExternalLink,
  Search,
  Award,
  BookOpen,
  DollarSign
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  color: string
}

interface CatalogCourse {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  price: number
  hotmart_url: string | null
  category_id: string | null
  created_at: string
  category?: Category
}

export default function CatalogPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<CatalogCourse[]>([])
  const [filteredCourses, setFilteredCourses] = useState<CatalogCourse[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    if (user) {
      fetchCourses()
      fetchCategories()
    }
  }, [user])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, selectedCategory])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      // 1. Obtener todos los cursos activos Y publicados en catálogo
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('is_active', true)
        .eq('is_published_in_catalog', true)
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // 2. Obtener los cursos que el usuario YA tiene
      const { data: userCourses, error: userCoursesError } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user?.id)

      if (userCoursesError) throw userCoursesError

      // 3. Filtrar para mostrar solo los cursos que el usuario NO tiene
      const userCourseIds = new Set(userCourses?.map(uc => uc.course_id) || [])
      const availableCourses = (allCourses || []).filter(
        course => !userCourseIds.has(course.id)
      )

      setCourses(availableCourses)
    } catch (error) {
      console.error('Error fetching catalog courses:', error)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = [...courses]

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(course => course.category_id === selectedCategory)
    }

    setFilteredCourses(filtered)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white text-lg">Cargando cursos disponibles...</div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-red-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              Catálogo de Cursos
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-4 sm:mb-6 max-w-2xl">
              Descubre nuevos cursos para ampliar tus conocimientos y alcanzar tus metas profesionales
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-white/80 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>Acceso inmediato</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>Contenido actualizado</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span>Aprende a tu ritmo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cursos disponibles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-700 text-white text-sm sm:text-base rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {filteredCourses.length} {filteredCourses.length === 1 ? 'curso disponible' : 'cursos disponibles'}
            </span>
            {(searchTerm || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                }}
                className="text-red-400 hover:text-red-300"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                >
                  <option value="">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Placeholder for future Price filter */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Precio</label>
              <select
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-500 border border-gray-600 rounded-lg text-sm cursor-not-allowed"
              >
                <option>Próximamente</option>
              </select>
            </div>

            {/* Placeholder for future Author filter */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Autor</label>
              <select
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-500 border border-gray-600 rounded-lg text-sm cursor-not-allowed"
              >
                <option>Próximamente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Cursos Disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-red-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center"
                      style={{ display: course.thumbnail_url ? 'none' : 'flex' }}
                    >
                      <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-70" />
                    </div>

                    {/* Nuevo Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                        DISPONIBLE
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Title */}
                    <h3 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                      {course.title}
                    </h3>

                    {/* Category */}
                    {course.category && (
                      <div className="mb-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${course.category.color}20`,
                            color: course.category.color,
                            border: `1px solid ${course.category.color}40`
                          }}
                        >
                          <span className="mr-1">{course.category.icon}</span>
                          {course.category.name}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {course.description && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-lg font-bold text-white">
                          {formatPrice(course.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-white text-sm font-semibold">5.0</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    {course.hotmart_url ? (
                      <a
                        href={course.hotmart_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-red-500/50"
                      >
                        Comprar Ahora
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-gray-700 text-gray-400 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-not-allowed"
                      >
                        No disponible
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-white mb-2">
              {searchTerm ? 'No se encontraron cursos' : '¡Ya tienes todos los cursos disponibles!'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : 'Felicidades, has adquirido todos nuestros cursos disponibles'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Ver todos los cursos
              </button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
