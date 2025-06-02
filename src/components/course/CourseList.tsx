'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Course } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { PlayCircle, Star, Book } from 'lucide-react'

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  console.log('🎯 CourseList renderizado')
  console.log('👤 User desde useAuth:', user?.email)
  console.log('🆔 User ID:', user?.id)

  useEffect(() => {
    console.log('🔄 CourseList useEffect ejecutado')
    console.log('👤 User en useEffect:', user?.email)
    if (user) {
      console.log('✅ Usuario existe, ejecutando fetchUserCourses')
      fetchUserCourses()
    } else {
      console.log('❌ No hay usuario en useEffect')
    }
  }, [user])

  const fetchUserCourses = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error

      const userCourses = data?.map(item => item.courses).filter(Boolean) as Course[]
      setCourses(userCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando tus cursos...</p>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes cursos aún</h3>
        <p className="text-gray-600">Los cursos que compres aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group cursor-pointer overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          onClick={() => window.location.href = `/course/${course.id}`}
        >
          {/* Imagen del curso */}
          <div className="relative overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="text-white text-center">
                  <Book className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm opacity-80">Imagen del curso</p>
                </div>
              )}
            </div>
            
            {/* Overlay al hacer hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <PlayCircle className="h-16 w-16 text-white" />
              </div>
            </div>
            
            {/* Badge de adquirido */}
            <div className="absolute top-4 right-4">
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Adquirido
              </span>
            </div>
          </div>

          {/* Contenido del card */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {course.title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {course.description || 'Descripción del curso disponible próximamente'}
            </p>

            {/* Rating y instructor */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">5.0</span>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Instructor</p>
                <p className="font-medium text-gray-900">Experto</p>
              </div>
            </div>

            {/* Categorías */}
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Programación
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                Intermedio
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}