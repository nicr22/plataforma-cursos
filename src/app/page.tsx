'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import HeroBanner from '@/components/home/HeroBanner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Course, LessonProgress } from '@/types'
import {
  Play,
  Star,
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  Users,
  ChevronRight,
  CheckCircle,
  BarChart3,
  Trophy,
  Target,
  Zap
} from 'lucide-react'

interface DashboardStats {
  totalCourses: number
  completedCourses: number
  totalWatchTime: number
  currentStreak: number
  totalProgress: number
}

interface ContinueWatchingCourse extends Course {
  lastWatchedLesson?: string
  progress?: number
  nextLessonTitle?: string
}

interface LastViewedCourse {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  progress?: number
}

export default function Home() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingCourse[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    completedCourses: 0,
    totalWatchTime: 0,
    currentStreak: 7,
    totalProgress: 0
  })
  const [loading, setLoading] = useState(false)
  const [lastViewedCourse, setLastViewedCourse] = useState<LastViewedCourse | null>(null)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Obtener cursos del usuario
      const { data: userCoursesData, error: coursesError } = await supabase
        .from('user_courses')
        .select(`
          course_id,
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

      const userCourses = userCoursesData?.map(item => item.courses).filter(Boolean) as Course[]
      setCourses(userCourses)

      // Detectar el último curso visto basándose en lesson_progress
      if (userCourses.length > 0) {
        const { data: recentProgress, error: progressError } = await supabase
          .from('lesson_progress')
          .select(`
            course_id,
            lesson_id,
            updated_at,
            watch_time
          `)
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (!progressError && recentProgress) {
          // Encontrar el curso correspondiente
          const lastCourse = userCourses.find(c => c.id === recentProgress.course_id)

          if (lastCourse) {
            // Calcular progreso del curso
            const { data: allProgress } = await supabase
              .from('lesson_progress')
              .select('completed')
              .eq('user_id', user?.id)
              .eq('course_id', lastCourse.id)

            const { data: totalLessons } = await supabase
              .from('lessons')
              .select('id')
              .in('module_id',
                await supabase
                  .from('modules')
                  .select('id')
                  .eq('course_id', lastCourse.id)
                  .then(res => res.data?.map(m => m.id) || [])
              )

            const completedCount = allProgress?.filter(p => p.completed).length || 0
            const totalCount = totalLessons?.length || 1
            const progress = Math.round((completedCount / totalCount) * 100)

            setLastViewedCourse({
              id: lastCourse.id,
              title: lastCourse.title,
              description: lastCourse.description || null,
              thumbnail_url: lastCourse.thumbnail_url || null,
              progress
            })
          }
        }
      }

      // Obtener progreso para "Continúa viendo"
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', false)
        .limit(6)

      if (progressError) throw progressError

      // Simular cursos con progreso (puedes mejorar esto con datos reales)
      const continueCourses = userCourses.slice(0, 3).map(course => ({
        ...course,
        progress: Math.floor(Math.random() * 70) + 10,
        nextLessonTitle: `Lección ${Math.floor(Math.random() * 10) + 1}`,
        lastWatchedLesson: 'Hace 2 días'
      }))
      setContinueWatching(continueCourses)

      // Calcular estadísticas
      const totalWatchTime = progressData?.reduce((acc, p) => acc + (p.watch_time || 0), 0) || 0
      setStats({
        totalCourses: userCourses.length,
        completedCourses: Math.floor(userCourses.length * 0.6),
        totalWatchTime: Math.floor(totalWatchTime / 3600), // convertir a horas
        currentStreak: 7,
        totalProgress: Math.floor((userCourses.length > 0 ? Math.random() * 100 : 0))
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (hours: number) => {
    if (hours < 1) return '< 1h'
    return `${hours}h`
  }

  /*if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white text-lg">Cargando tu dashboard...</div>
          </div>
        </div>
      </MainLayout>
    )
  }*/

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Banner - Banners promocionales o último curso visto */}
        <HeroBanner lastViewedCourse={lastViewedCourse} />

        {/* Stats Dashboard */}
       {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.totalCourses}</div>
                <div className="text-blue-200 text-sm">Cursos Activos</div>
              </div>
            </div>
            <div className="text-blue-200 text-sm">+2 este mes</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.completedCourses}</div>
                <div className="text-green-200 text-sm">Completados</div>
              </div>
            </div>
            <div className="text-green-200 text-sm">¡Excelente progreso!</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{formatTime(stats.totalWatchTime)}</div>
                <div className="text-purple-200 text-sm">Tiempo Estudiado</div>
              </div>
            </div>
            <div className="text-purple-200 text-sm">Esta semana: 8h</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.currentStreak}</div>
                <div className="text-orange-200 text-sm">Días Seguidos</div>
              </div>
            </div>
            <div className="text-orange-200 text-sm">¡Sigue así! 🔥</div>
          </div>
        </div>*/}

        {/* Continúa Viendo */}
        {continueWatching.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Continúa Aprendiendo</h2>
              <button className="text-gray-400 hover:text-white transition-colors hidden sm:flex items-center gap-2">
                Ver todo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {continueWatching.map((course) => (
                <div
                  key={course.id}
                  onClick={() => window.location.href = `/course/${course.id}`}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-red-500">
                    <div className="aspect-video relative">
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
                        className="w-full h-full bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 flex items-center justify-center"
                        style={{ display: course.thumbnail_url ? 'none' : 'flex' }}
                      >
                        <BookOpen className="w-16 h-16 text-white opacity-80" />
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Play className="w-16 h-16 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="text-white font-semibold text-lg mb-1 truncate group-hover:text-gray-300 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {course.progress}% completado • {course.nextLessonTitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos los Cursos */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Mis Cursos</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none text-sm sm:text-base w-full sm:w-auto">
                <option>Todos los cursos</option>
                <option>En progreso</option>
                <option>Completados</option>
                <option>Sin empezar</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => window.location.href = `/course/${course.id}`}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-red-500">
                  <div className="aspect-video relative">
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
                      className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center"
                      style={{ display: course.thumbnail_url ? 'none' : 'flex' }}
                    >
                      <BookOpen className="w-16 h-16 text-white opacity-80" />
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      Adquirido
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-white mx-auto mb-2 drop-shadow-lg" />
                      <div className="text-white font-semibold">Comenzar Curso</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-gray-300 transition-colors">
                    {course.title}
                  </h3>
                  
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
              </div>
            ))}
          </div>

          {/* Empty State */}
          {courses.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-24 h-24 text-gray-600 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-4">
                ¡Comienza tu viaje de aprendizaje!
              </h3>
              <p className="text-gray-400 text-lg mb-8">
                Los cursos que adquieras aparecerán aquí. Explora nuestro catálogo y encuentra el curso perfecto para ti.
              </p>
              <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
                Explorar Catálogo
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}