'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, PlayCircle, Trophy, Clock, Target } from 'lucide-react'

interface ProgressStats {
  totalLessons: number
  completedLessons: number
  totalWatchTime: number
  completionPercentage: number
  moduleProgress: {
    moduleId: string
    moduleName: string
    totalLessons: number
    completedLessons: number
    percentage: number
  }[]
}

interface CourseProgressProps {
  courseId: string
}

function CourseProgress({ courseId }: CourseProgressProps) {
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (courseId && user) {
      fetchProgressStats()
    }
  }, [courseId, user])

  const fetchProgressStats = async () => {
    try {
      // Obtener estructura del curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            id,
            title,
            lessons (
              id,
              title,
              video_duration
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError

      // Obtener progreso del usuario
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user?.id)

      if (progressError) throw progressError

      // Calcular estadísticas
      let totalLessons = 0
      let completedLessons = 0
      let totalWatchTime = 0
      const moduleProgress: ProgressStats['moduleProgress'] = []

      courseData.modules.forEach((module: any) => {
        let moduleCompletedLessons = 0
        
        module.lessons.forEach((lesson: any) => {
          totalLessons++
          
          const lessonProgress = progressData?.find(p => p.lesson_id === lesson.id)
          if (lessonProgress?.completed) {
            completedLessons++
            moduleCompletedLessons++
          }
          if (lessonProgress?.watch_time) {
            totalWatchTime += lessonProgress.watch_time
          }
        })

        moduleProgress.push({
          moduleId: module.id,
          moduleName: module.title,
          totalLessons: module.lessons.length,
          completedLessons: moduleCompletedLessons,
          percentage: module.lessons.length > 0 
            ? Math.round((moduleCompletedLessons / module.lessons.length) * 100)
            : 0
        })
      })

      const completionPercentage = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0

      setStats({
        totalLessons,
        completedLessons,
        totalWatchTime,
        completionPercentage,
        moduleProgress
      })
    } catch (error) {
      console.error('Error fetching progress stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-blue-500" />
        <h3 className="text-xl font-bold text-gray-900">Tu Progreso</h3>
      </div>

      {/* Progreso general */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-gray-900">Progreso General</span>
          <span className="text-2xl font-bold text-blue-600">{stats.completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.completedLessons}</div>
            <div className="text-sm text-gray-600">de {stats.totalLessons} lecciones</div>
            <div className="text-xs text-blue-600 font-medium">Completadas</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {formatWatchTime(stats.totalWatchTime)}
            </div>
            <div className="text-xs text-green-600 font-medium">Tiempo de estudio</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.moduleProgress.length}</div>
            <div className="text-xs text-purple-600 font-medium">Módulos disponibles</div>
          </div>
        </div>
      </div>

      {/* Progreso por módulo */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Progreso por Módulo</h4>
        <div className="space-y-4">
          {stats.moduleProgress.map((module) => (
            <div key={module.moduleId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{module.moduleName}</h5>
                <span className="text-sm font-semibold text-gray-600">
                  {module.completedLessons}/{module.totalLessons} lecciones
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${module.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 min-w-[40px]">
                  {module.percentage}%
                </span>
                {module.percentage === 100 && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logros */}
      {stats.completionPercentage >= 100 && (
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h4 className="text-lg font-bold text-yellow-800">¡Felicitaciones!</h4>
              <p className="text-yellow-700">Has completado todo el curso</p>
            </div>
          </div>
          <p className="text-sm text-yellow-600">
            Has demostrado dedicación y constancia. ¡Sigue así!
          </p>
        </div>
      )}
      
      {stats.completionPercentage >= 50 && stats.completionPercentage < 100 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-500" />
            <div>
              <h4 className="font-semibold text-blue-800">¡Vas por buen camino!</h4>
              <p className="text-sm text-blue-600">
                Ya tienes más del 50% completado. ¡Continúa así!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseProgress