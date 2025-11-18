'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Play,
  Trophy
} from 'lucide-react'
import dynamic from 'next/dynamic'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false, loading: () => <div className="text-white">Cargando reproductor...</div> })

interface CourseWithModules extends Course {
  modules: (Module & { lessons: Lesson[] })[]
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<CourseWithModules | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const { user, loading: authLoading, signOut } = useAuth()

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      console.log('→ loadData:', { authLoading, hasUser: !!user, courseId })

      if (authLoading) {
        console.log('→ Auth still loading, waiting...')
        return
      }

      if (!user) {
        router.push('/')
        return
      }

      if (!user.id || !courseId) return

      try {
        setLoading(true)

        const { data: access } = await supabase
          .from('user_courses')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle()

        if (!isMounted) return

        if (!access) {
          setLoading(false)
          router.push('/courses')
          return
        }

        const [courseResult, progressResult] = await Promise.all([
          supabase
            .from('courses')
            .select(`*, modules (*, lessons (*))`)
            .eq('id', courseId)
            .single(),
          supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', user.id)
        ])

        if (!isMounted) return

        const { data: courseData, error: courseError } = courseResult
        const { data: progressData } = progressResult

        if (courseError || !courseData) {
          setLoading(false)
          router.push('/courses')
          return
        }

        const processedCourse = {
          ...courseData,
          modules: (courseData.modules || [])
            .sort((a: Module, b: Module) => a.order_index - b.order_index)
            .map((module: Module & { lessons: Lesson[] }) => ({
              ...module,
              lessons: (module.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
            }))
        }

        setCourse(processedCourse)

        if (processedCourse.modules?.[0]) {
          setExpandedModules(new Set([processedCourse.modules[0].id]))
          if (processedCourse.modules[0].lessons?.[0]) {
            setSelectedLesson(processedCourse.modules[0].lessons[0])
          }
        }

        if (progressData) {
          const progressMap = progressData.reduce((acc, item) => {
            acc[item.lesson_id] = item
            return acc
          }, {} as Record<string, LessonProgress>)
          setProgress(progressMap)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading course:', error)
        if (isMounted) {
          setLoading(false)
          router.push('/courses')
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [authLoading, user?.id, courseId, router])

  // Actualizar progreso
  const updateProgress = useCallback(async (lessonId: string, watchedSeconds: number, isCompleted: boolean) => {
    if (!user?.id || !courseId) return

    const progressData = {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      watch_time: Math.floor(watchedSeconds),
      completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    const { data } = await supabase
      .from('lesson_progress')
      .upsert(progressData, { onConflict: 'user_id,lesson_id' })
      .select()
      .maybeSingle()

    if (data) {
      setProgress(prev => ({
        ...prev,
        [lessonId]: {
          id: data.id,
          user_id: user.id,
          lesson_id: lessonId,
          watch_time: Math.floor(watchedSeconds),
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          created_at: data.created_at,
          updated_at: new Date().toISOString()
        }
      }))
    }
  }, [user?.id, courseId])

  const handleVideoProgress = useCallback((progressData: { played: number, playedSeconds: number }) => {
    if (!selectedLesson) return

    if (progressData.played >= 0.9 && Math.floor(progressData.playedSeconds) % 10 === 0) {
      updateProgress(selectedLesson.id, progressData.playedSeconds, true)
    } else if (Math.floor(progressData.playedSeconds) % 10 === 0) {
      updateProgress(selectedLesson.id, progressData.playedSeconds, false)
    }
  }, [selectedLesson, updateProgress])

  const markAsCompleted = useCallback(() => {
    if (selectedLesson) {
      updateProgress(selectedLesson.id, 0, true)
    }
  }, [selectedLesson, updateProgress])

  const handleLogout = useCallback(async () => {
    await signOut()
    router.push('/')
  }, [signOut, router])

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  const isLessonCompleted = useCallback((lessonId: string) => {
    return progress[lessonId]?.completed || false
  }, [progress])

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }, [])

  const getModuleProgress = useCallback((module: Module & { lessons: Lesson[] }) => {
    const completedLessons = module.lessons.filter(lesson => isLessonCompleted(lesson.id)).length
    const totalLessons = module.lessons.length
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  }, [isLessonCompleted])

  const totalProgress = useMemo(() => {
    if (!course) return { completed: 0, total: 0, percentage: 0 }
    const total = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const completed = course.modules.reduce((acc, m) =>
      acc + m.lessons.filter(l => isLessonCompleted(l.id)).length, 0)
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
  }, [course, isLessonCompleted])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">Cargando curso...</div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-400">No se pudo cargar el curso</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-black/90 via-gray-900/90 to-black/90 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push('/courses')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Volver</span>
              </button>
              <div className="border-l border-gray-600 pl-4 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{course.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-2 sm:p-3 border border-gray-600/30">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-gradient-to-b from-gray-900 via-gray-800 to-black lg:border-r border-gray-700 overflow-y-auto order-2 lg:order-1">
          <div className="p-4">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-500 rounded-lg flex items-center justify-center">
                  <Book className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Contenido</h2>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Progreso</span>
                  <span className="text-white font-semibold">{totalProgress.completed} / {totalProgress.total}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${totalProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => {
                const isExpanded = expandedModules.has(module.id)
                const moduleProgress = getModuleProgress(module)
                const completedLessons = module.lessons.filter(l => isLessonCompleted(l.id)).length

                return (
                  <div key={module.id} className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{moduleIndex + 1}</span>
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className="font-semibold text-white truncate">{module.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">{completedLessons}/{module.lessons.length}</span>
                            <span className="text-xs text-gray-400">{moduleProgress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {moduleProgress === 100 && <Trophy className="w-5 h-5 text-yellow-500" />}
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    <div className="px-4 pb-2">
                      <div className="w-full bg-gray-700/50 rounded-full h-1">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-400 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${moduleProgress}%` }}
                        />
                      </div>
                    </div>

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
                              className={`cursor-pointer transition-all ${
                                isSelected ? 'bg-gradient-to-r from-red-600/20 to-red-500/10 border-l-4 border-red-500' : 'hover:bg-gray-700/30'
                              }`}
                            >
                              <div className="flex items-center gap-4 p-4">
                                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      isSelected ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-gray-500 text-gray-400'
                                    }`}>
                                      <span className="text-xs font-medium">{lessonIndex + 1}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                    {lesson.title}
                                  </h4>

                                  <div className="flex items-center gap-3 mt-1">
                                    {lesson.video_duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-500">{formatDuration(lesson.video_duration)}</span>
                                      </div>
                                    )}

                                    {watchedTime > 0 && !isCompleted && (
                                      <div className="flex items-center gap-1">
                                        <Play className="w-3 h-3 text-blue-400" />
                                        <span className="text-xs text-blue-400">{formatDuration(watchedTime)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isSelected && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />}
                              </div>

                              {watchedTime > 0 && lesson.video_duration && !isCompleted && (
                                <div className="px-4 pb-2">
                                  <div className="w-full bg-gray-700/50 rounded-full h-0.5">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-0.5 rounded-full transition-all"
                                      style={{ width: `${(watchedTime / lesson.video_duration) * 100}%` }}
                                    />
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

        {/* Video */}
        <div className="flex-1 bg-gradient-to-b from-gray-900/50 to-black/30 order-1 lg:order-2">
          {selectedLesson ? (
            <div className="flex flex-col h-full">
              <div className="bg-black py-3 sm:py-6 flex justify-center">
                <div className="w-full max-w-[1400px] px-2 sm:px-4">
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    {selectedLesson.video_url ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <ReactPlayer
                          url={selectedLesson.video_url}
                          width="100%"
                          height="100%"
                          controls
                          onProgress={handleVideoProgress}
                          progressInterval={1000}
                          config={{
                            file: {
                              attributes: {
                                controlsList: 'nodownload'
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <PlayCircle className="h-20 w-20 mx-auto mb-6 text-gray-400" />
                          <p className="text-xl mb-2">No hay video disponible</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-6 md:p-8 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                        {selectedLesson.title}
                      </h2>
                      <p className="text-gray-300 text-sm sm:text-base">
                        {selectedLesson.description || 'Descripción de la lección'}
                      </p>
                    </div>

                    {!isLessonCompleted(selectedLesson.id) && (
                      <button
                        onClick={markAsCompleted}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all w-full sm:w-auto shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Completar
                      </button>
                    )}
                  </div>

                  {isLessonCompleted(selectedLesson.id) && (
                    <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/30 rounded-xl p-4 sm:p-6 flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-400 text-lg">¡Lección completada!</h4>
                      </div>
                    </div>
                  )}

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
                <p className="text-2xl font-semibold text-white mb-3">Selecciona una lección</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
