// ============================================
// ARCHIVO: src/app/course/[id]/page.tsx
// ============================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Course, Module, Lesson, LessonProgress } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import Comments from '@/components/course/Comments'
import {
  PlayCircle,
  CheckCircle,
  ArrowLeft,
  User,
  LogOut,
  Clock,
  ChevronDown,
  ChevronRight,
  Book,
  Star,
  Lock,
  Play,
  Trophy,
  BarChart3
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Importar ReactPlayer dinámicamente para evitar problemas de SSR
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface CourseWithModules extends Course {
  modules: (Module & { lessons: Lesson[] })[]
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<CourseWithModules | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({})
  const [watchTime, setWatchTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const { user, profile, loading: authLoading, signOut } = useAuth()

  useEffect(() => {
    // Solo ejecutar cuando auth haya terminado de cargar
    if (authLoading) return

    if (courseId && user) {
      fetchCourseData()
      fetchProgress()
    } else if (!user) {
      // Si no hay usuario después de auth cargar, redirigir
      window.location.href = '/'
    }
  }, [courseId, user, authLoading])

  const fetchCourseData = async () => {
    try {
      setLoading(true)

      if (!user?.id) {
        console.error('No user ID available')
        setCourse(null)
        setLoading(false)
        return
      }

      // Verificar acceso al curso
      const { data: access, error: accessError } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (accessError || !access) {
        console.error('No tienes acceso a este curso')
        setCourse(null)
        setLoading(false)
        return
      }

      // Obtener datos del curso con módulos y lecciones
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            *,
            lessons (*)
          )
        `)
        .eq('id', courseId)
        .single()

      if (error || !data) {
        console.error('Error al cargar el curso:', error)
        setCourse(null)
        setLoading(false)
        return
      }

      // Ordenar módulos y lecciones
      const courseData = {
        ...data,
        modules: (data.modules || [])
          .sort((a: Module, b: Module) => a.order_index - b.order_index)
          .map((module: Module & { lessons: Lesson[] }) => ({
            ...module,
            lessons: (module.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
          }))
      }

      setCourse(courseData)

      // Expandir el primer módulo por defecto y seleccionar primera lección
      if (courseData.modules?.length > 0) {
        setExpandedModules(new Set([courseData.modules[0].id]))
        if (courseData.modules[0].lessons?.length > 0) {
          setSelectedLesson(courseData.modules[0].lessons[0])
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error crítico al cargar curso:', error)
      setCourse(null)
      setLoading(false)
    }
  }

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user?.id)

      if (error) throw error

      const progressMap = data?.reduce((acc, item) => {
        acc[item.lesson_id] = item
        return acc
      }, {} as Record<string, LessonProgress>) || {}

      setProgress(progressMap)
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const updateProgress = async (lessonId: string, watchedSeconds: number, isCompleted: boolean) => {
    try {
      if (!user?.id || !lessonId || !courseId) {
        console.warn('Cannot update progress: missing user, lesson or course ID');
        return;
      }

      const progressData = {
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId, // IMPORTANTE: Añadido course_id
        watch_time: Math.floor(watchedSeconds),
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Guardando progreso:', progressData);

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(progressData, {
          onConflict: 'user_id,lesson_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error al guardar progreso:', error);
        throw error;
      }

      console.log('✅ Progreso guardado exitosamente:', data);

      // Actualizar estado local con los datos retornados del servidor
      setProgress(prev => ({
        ...prev,
        [lessonId]: {
          id: data?.id || prev[lessonId]?.id || '',
          user_id: user.id,
          lesson_id: lessonId,
          watch_time: Math.floor(watchedSeconds),
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          created_at: data?.created_at || prev[lessonId]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('💥 Error updating progress:', error);
      // No mostrar alerta por cada error, solo loggear
      console.error('Error details:', error);
    }
  };

  const handleVideoProgress = (progressData: { played: number, playedSeconds: number }) => {
    setWatchTime(progressData.playedSeconds)
    
    if (selectedLesson && videoDuration > 0) {
      // Marcar como completado si vio más del 90%
      const watchedPercentage = progressData.played
      const isCompleted = watchedPercentage >= 0.9
      
      // Actualizar progreso cada 10 segundos
      if (Math.floor(progressData.playedSeconds) % 10 === 0) {
        updateProgress(selectedLesson.id, progressData.playedSeconds, isCompleted)
      }
    }
  }

  const handleVideoDuration = (duration: number) => {
    setVideoDuration(duration)
  }

  const markAsCompleted = () => {
    if (selectedLesson) {
      updateProgress(selectedLesson.id, watchTime, true)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const isLessonCompleted = (lessonId: string) => {
    return progress[lessonId]?.completed || false
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const getModuleProgress = (module: Module & { lessons: Lesson[] }) => {
    const completedLessons = module.lessons.filter(lesson => isLessonCompleted(lesson.id)).length
    const totalLessons = module.lessons.length
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  }

  const handleLogout = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <div className="text-white text-xl font-semibold">Cargando curso...</div>
          <div className="text-gray-400 text-sm mt-2">Preparando tu experiencia de aprendizaje</div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-400">
            No se pudo cargar el curso o no tienes acceso.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header del curso - Estilo Netflix */}
      <div className="bg-gradient-to-r from-black/90 via-gray-900/90 to-black/90 backdrop-blur-md border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Lado izquierdo - Info del curso */}
            <div className="flex items-center gap-6">
              <button 
                onClick={() => window.location.href = '/courses'}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:transform group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Volver a mis cursos</span>
              </button>
              <div className="border-l border-gray-600 pl-6">
                <h1 className="text-2xl font-bold text-white mb-1">{course.title}</h1>
                <p className="text-gray-400">{course.description}</p>
              </div>
            </div>

            {/* Lado derecho - Usuario y acciones */}
            <div className="flex items-center gap-4">
              {/* Usuario */}
              <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-3 border border-gray-600/30">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-white">
                    {profile?.full_name || user?.email}
                  </div>
                  <div className="text-xs text-gray-400">
                    {profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-600/20 rounded-lg transition-colors group"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar con módulos y lecciones - DISEÑO NETFLIX RENOVADO */}
        <div className="w-full lg:w-96 bg-gradient-to-b from-gray-900 via-gray-800 to-black lg:border-r border-gray-700 shadow-2xl min-h-screen overflow-y-auto order-2 lg:order-1">
          <div className="p-4 sm:p-6">
            {/* Header del sidebar */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-500 rounded-lg flex items-center justify-center">
                  <Book className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Contenido del curso</h2>
              </div>
              
              {/* Progreso general del curso */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Progreso general</span>
                  <span className="text-white font-semibold">
                    {course.modules.reduce((acc, module) => acc + module.lessons.filter(lesson => isLessonCompleted(lesson.id)).length, 0)} / {course.modules.reduce((acc, module) => acc + module.lessons.length, 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${course.modules.reduce((acc, module) => acc + module.lessons.length, 0) > 0 
                        ? (course.modules.reduce((acc, module) => acc + module.lessons.filter(lesson => isLessonCompleted(lesson.id)).length, 0) / course.modules.reduce((acc, module) => acc + module.lessons.length, 0)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Módulos y lecciones */}
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => {
                const isExpanded = expandedModules.has(module.id)
                const moduleProgress = getModuleProgress(module)
                const completedLessons = module.lessons.filter(lesson => isLessonCompleted(lesson.id)).length
                
                return (
                  <div key={module.id} className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                    {/* Header del módulo */}
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm font-bold">{moduleIndex + 1}</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-white group-hover:text-gray-200 transition-colors">
                            {module.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">
                              {completedLessons}/{module.lessons.length} lecciones
                            </span>
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">{moduleProgress}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {moduleProgress === 100 && (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                    </button>

                    {/* Barra de progreso del módulo */}
                    <div className="px-4 pb-2">
                      <div className="w-full bg-gray-700/50 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-400 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${moduleProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Lecciones del módulo */}
                    {isExpanded && (
                      <div className="border-t border-gray-700/50">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isCompleted = isLessonCompleted(lesson.id)
                          const isSelected = selectedLesson?.id === lesson.id
                          const watchedTime = progress[lesson.id]?.watch_time || 0
                          
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className={`group cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-red-600/20 to-red-500/10 border-l-4 border-red-500'
                                  : 'hover:bg-gray-700/30'
                              }`}
                            >
                              <div className="flex items-center gap-4 p-4">
                                {/* Número de lección */}
                                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      isSelected 
                                        ? 'border-red-500 bg-red-500/20 text-red-400' 
                                        : 'border-gray-500 text-gray-400'
                                    }`}>
                                      <span className="text-xs font-medium">{lessonIndex + 1}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Contenido de la lección */}
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium text-sm truncate transition-colors ${
                                    isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                  }`}>
                                    {lesson.title}
                                  </h4>
                                  
                                  <div className="flex items-center gap-3 mt-1">
                                    {lesson.video_duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-500">
                                          {formatDuration(lesson.video_duration)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {watchedTime > 0 && !isCompleted && (
                                      <div className="flex items-center gap-1">
                                        <Play className="w-3 h-3 text-blue-400" />
                                        <span className="text-xs text-blue-400">
                                          {formatDuration(watchedTime)} visto
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {lesson.is_free && (
                                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-600/30">
                                      Gratis
                                    </span>
                                  )}
                                  
                                  {isSelected && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Barra de progreso individual */}
                              {watchedTime > 0 && lesson.video_duration && !isCompleted && (
                                <div className="px-4 pb-2">
                                  <div className="w-full bg-gray-700/50 rounded-full h-0.5">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-0.5 rounded-full transition-all duration-300"
                                      style={{ width: `${(watchedTime / lesson.video_duration) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Área principal del video y contenido */}
        <div className="flex-1 bg-gradient-to-b from-gray-900/50 to-black/30 order-1 lg:order-2">
          {selectedLesson ? (
            <div className="flex flex-col h-full">
              {/* Área del video */}
              <div className="bg-black py-3 sm:py-6 flex justify-center">
                <div className="w-full max-w-[1400px] px-2 sm:px-4">
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                    {selectedLesson.video_url && typeof window !== 'undefined' ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <ReactPlayer
                          url={selectedLesson.video_url}
                          width="100%"
                          height="100%"
                          controls
                          onProgress={handleVideoProgress}
                          onDuration={handleVideoDuration}
                          progressInterval={1000}
                        />
                      </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <PlayCircle className="h-20 w-20 mx-auto mb-6 text-gray-400" />
                        <p className="text-xl mb-2">
                          {!selectedLesson.video_url 
                            ? 'No hay video disponible para esta lección'
                            : 'Cargando reproductor...'
                          }
                        </p>
                        <p className="text-gray-400">
                          {selectedLesson.description || 'Contenido próximamente disponible'}
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Información de la lección */}
              <div className="flex-1 p-4 sm:p-6 md:p-8 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                        {selectedLesson.title}
                      </h2>
                      <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed">
                        {selectedLesson.description || 'En esta lección aprenderás conceptos fundamentales que te ayudarán a avanzar en tu aprendizaje.'}
                      </p>
                    </div>

                    {!isLessonCompleted(selectedLesson.id) && (
                      <button
                        onClick={markAsCompleted}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 w-full sm:w-auto sm:whitespace-nowrap shadow-lg hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Marcar como completado
                      </button>
                    )}
                  </div>

                  {/* Estado de completado */}
                  {isLessonCompleted(selectedLesson.id) && (
                    <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/30 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-400 text-lg">¡Lección completada!</h4>
                        <p className="text-green-300">
                          Completaste esta lección el {new Date(progress[selectedLesson.id]?.completed_at || '').toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comentarios de la lección */}
                  <div className="bg-gray-800/20 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                    <Comments lessonId={selectedLesson.id} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <PlayCircle className="h-24 w-24 mx-auto mb-6" />
                <p className="text-2xl font-semibold text-white mb-3">Selecciona una lección para comenzar</p>
                <p className="text-lg">Elige cualquier lección del menú lateral para empezar tu aprendizaje</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}