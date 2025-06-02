// ============================================
// ARCHIVO: src/app/courses/page.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Course } from '@/types'
import { 
  Play, 
  Star, 
  Clock, 
  BookOpen, 
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  Calendar,
  Award
} from 'lucide-react'

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent') // recent, title, progress
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [filterBy, setFilterBy] = useState('all') // all, completed, in-progress, not-started

  useEffect(() => {
    if (user) {
      fetchUserCourses()
    }
  }, [user])

  const fetchUserCourses = async () => {
    try {
      const { data: userCoursesData, error: coursesError } = await supabase
        .from('user_courses')
        .select(`
          course_id,
          created_at,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            price,
            created_at
          )
        `)
        .eq('user_id', user?.id)

      if (coursesError) throw coursesError

      const userCourses = userCoursesData?.map(item => ({
        ...item.courses,
        enrolled_at: item.created_at
      })).filter(Boolean) as Course[]
      
      setCourses(userCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar y ordenar cursos
  const filteredAndSortedCourses = courses
    .filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      // Aquí puedes agregar lógica de filtros más adelante
      return matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

  /*if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white text-lg">Cargando tus cursos...</div>
          </div>
        </div>
      </MainLayout>
    )
  }*/

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header de la página */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Mis Cursos</h1>
            <p className="text-gray-400 text-lg">
              Tienes {courses.length} curso{courses.length !== 1 ? 's' : ''} adquirido{courses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Controles de búsqueda y filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Barra de búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cursos..."
                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-white placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Controles de vista y ordenamiento */}
            <div className="flex items-center gap-4">
              {/* Selector de ordenamiento */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800/50 text-white px-4 py-3 rounded-xl border border-gray-600/50 focus:border-red-500/50 focus:outline-none"
              >
                <option value="recent">Más recientes</option>
                <option value="title">Por título</option>
              </select>

              {/* Selector de vista */}
              <div className="flex items-center bg-gray-800/30 rounded-xl border border-gray-600/30">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-l-xl transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-r-xl transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de cursos */}
        {filteredAndSortedCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-24 h-24 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-4">
              {searchTerm ? 'No se encontraron cursos' : '¡Comienza tu viaje de aprendizaje!'}
            </h3>
            <p className="text-gray-400 text-lg mb-8">
              {searchTerm 
                ? `No hay cursos que coincidan con "${searchTerm}"`
                : 'Los cursos que adquieras aparecerán aquí. Explora nuestro catálogo y encuentra el curso perfecto para ti.'
              }
            </p>
            {!searchTerm && (
              <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
                Explorar Catálogo
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => window.location.href = `/course/${course.id}`}
                className={`group cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'block' 
                    : 'flex items-center gap-6 bg-gray-800/30 rounded-xl p-4 hover:bg-gray-800/50'
                } transition-all duration-300`}
              >
                {viewMode === 'grid' ? (
                  // Vista de Grid (Cards)
                  <>
                    <div className="relative overflow-hidden rounded-xl bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                      <div className="aspect-video">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Badge de adquirido */}
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                          Adquirido
                        </span>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-16 h-16 text-white mx-auto mb-2 drop-shadow-lg" />
                          <div className="text-white font-semibold">Continuar Curso</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-gray-300 transition-colors">
                        {course.title}
                      </h3>
                      
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {course.description || 'Descripción del curso disponible próximamente'}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-gray-300 text-sm">5.0</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                        <span className="text-gray-400 text-sm">Intermedio</span>
                      </div>

                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/30">
                          Programación
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Vista de Lista
                  <>
                    <div className="w-32 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-gray-300 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                        {course.description || 'Descripción del curso disponible próximamente'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span>5.0</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Adquirido {new Date(course.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                        Adquirido
                      </span>
                      <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Continuar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}