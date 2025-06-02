import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface SearchResult {
  id: string
  type: 'course' | 'lesson'
  title: string
  description?: string
  course_title?: string
  course_id?: string
  lesson_id?: string
  module_title?: string
  duration?: number
  image_url?: string
  match_score: number
}

interface UseSearchReturn {
  searchResults: SearchResult[]
  isSearching: boolean
  search: (query: string) => Promise<void>
  clearResults: () => void
}

export const useSearch = (): UseSearchReturn => {
  const { user } = useAuth()
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [userCourseIds, setUserCourseIds] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      loadUserCourses()
    }
  }, [user])

  const loadUserCourses = async () => {
    try {
      const { data: userCourses } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user?.id)

      const courseIds = userCourses?.map(uc => uc.course_id) || []
      setUserCourseIds(courseIds)
    } catch (error) {
      console.error('Error loading user courses:', error)
    }
  }

  const calculateMatchScore = (text: string, query: string): number => {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    
    if (lowerText.startsWith(lowerQuery)) return 100
    if (lowerText.includes(lowerQuery)) return 80
    
    const queryWords = lowerQuery.split(' ')
    const textWords = lowerText.split(' ')
    let wordMatches = 0
    
    queryWords.forEach(queryWord => {
      textWords.forEach(textWord => {
        if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
          wordMatches++
        }
      })
    })
    
    return (wordMatches / queryWords.length) * 60
  }

  const searchCourses = async (query: string): Promise<SearchResult[]> => {
    if (userCourseIds.length === 0) return []

    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description, image_url')
      .in('id', userCourseIds)
      .eq('is_active', true)

    if (!courses) return []

    const results: SearchResult[] = []
    
    courses.forEach(course => {
      const titleScore = calculateMatchScore(course.title, query)
      const descScore = course.description ? calculateMatchScore(course.description, query) : 0
      const maxScore = Math.max(titleScore, descScore)
      
      if (maxScore > 30) {
        results.push({
          id: course.id,
          type: 'course',
          title: course.title,
          description: course.description,
          image_url: course.image_url,
          match_score: maxScore
        })
      }
    })

    return results
  }

  const searchLessons = async (query: string): Promise<SearchResult[]> => {
    if (userCourseIds.length === 0) return []

    // Primero obtenemos todas las lecciones
    const { data: lessons } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        description,
        duration,
        modules (
          id,
          title,
          course_id,
          courses (
            id,
            title,
            image_url
          )
        )
      `)

    if (!lessons) return []

    const results: SearchResult[] = []
    
    lessons.forEach(lesson => {
      // Verificar que el lesson tenga módulo y curso
      if (!lesson.modules || !lesson.modules.courses) return
      
      // Verificar si el curso está en la lista de cursos del usuario
      if (!userCourseIds.includes(lesson.modules.course_id)) return
      
      const titleScore = calculateMatchScore(lesson.title, query)
      const descScore = lesson.description ? calculateMatchScore(lesson.description, query) : 0
      const moduleScore = calculateMatchScore(lesson.modules.title, query)
      const maxScore = Math.max(titleScore, descScore, moduleScore)
      
      if (maxScore > 30) {
        results.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          description: lesson.description,
          course_title: lesson.modules.courses.title,
          course_id: lesson.modules.courses.id,
          lesson_id: lesson.id,
          module_title: lesson.modules.title,
          duration: lesson.duration,
          image_url: lesson.modules.courses.image_url,
          match_score: maxScore
        })
      }
    })

    return results
  }

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const [courseResults, lessonResults] = await Promise.all([
        searchCourses(query),
        searchLessons(query)
      ])

      const allResults = [...courseResults, ...lessonResults]
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10)

      setSearchResults(allResults)
    } catch (error) {
      console.error('Error searching:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [userCourseIds])

  const clearResults = useCallback(() => {
    setSearchResults([])
  }, [])

  return {
    searchResults,
    isSearching,
    search,
    clearResults
  }
}