'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import CourseManagement from '@/components/admin/CourseManagement'
import ModuleManagement from '@/components/admin/ModuleManagement'
import UserManagement from '@/components/admin/UserManagement'
import BannerManagement from '@/components/admin/BannerManagement'
import {
  BookOpen,
  Users,
  BarChart3,
  MessageSquare,
  ArrowLeft,
  Home,
  Settings,
  Image
} from 'lucide-react'

type AdminView = 'dashboard' | 'courses' | 'modules' | 'users' | 'analytics' | 'banners'

interface SelectedCourse {
  id: string
  title: string
}

interface DashboardStats {
  totalCourses: number
  totalUsers: number
  totalLessons: number
  totalComments: number
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeView, setActiveView] = useState<AdminView>('dashboard')
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalUsers: 0,
    totalLessons: 0,
    totalComments: 0
  })

  const checkAdminRole = useCallback(async () => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin role:', error)
      router.push('/')
    }
  }, [user, router])

  const loadDashboardStats = useCallback(async () => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const [coursesRes, usersRes, lessonsRes, commentsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('lessons').select('id', { count: 'exact' }),
        supabase.from('comments').select('id', { count: 'exact' })
      ])

      setStats({
        totalCourses: coursesRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalLessons: lessonsRes.count || 0,
        totalComments: commentsRes.count || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }

    if (user) {
      checkAdminRole()
      loadDashboardStats()
    }
  }, [user, loading, router, checkAdminRole, loadDashboardStats])

  const handleManageContent = (courseId: string, courseTitle: string) => {
    setSelectedCourse({ id: courseId, title: courseTitle })
    setActiveView('modules')
  }

  const handleBackToCourses = () => {
    setSelectedCourse(null)
    setActiveView('courses')
  }

  const handleBackToDashboard = () => {
    setSelectedCourse(null)
    setActiveView('dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'courses', label: 'Cursos', icon: BookOpen },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'banners', label: 'Banners', icon: Image },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {activeView === 'modules' && selectedCourse && (
              <button
                onClick={handleBackToCourses}
                className="flex items-center text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver a Cursos
              </button>
            )}
            {activeView !== 'dashboard' && activeView !== 'modules' && (
              <button
                onClick={handleBackToDashboard}
                className="flex items-center text-gray-300 hover:text-white transition-colors"
              >
                <Home className="w-5 h-5 mr-2" />
                Dashboard
              </button>
            )}
            <h1 className="text-2xl font-bold text-white">
              {activeView === 'modules' && selectedCourse
                ? `Gestión de Contenido - ${selectedCourse.title}`
                : activeView === 'dashboard'
                ? 'Panel Administrativo'
                : activeView === 'courses'
                ? 'Gestión de Cursos'
                : activeView === 'users'
                ? 'Gestión de Usuarios'
                : activeView === 'banners'
                ? 'Gestión de Banners'
                : 'Analytics'
              }
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Admin: {user?.email}</span>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Plataforma
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Solo mostrar si no estamos en vista de módulos */}
        {activeView !== 'modules' && (
          <aside className="w-64 bg-gray-800 min-h-screen p-6">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as AdminView)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 p-6 ${activeView === 'modules' ? 'w-full' : ''}`}>
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Cursos</p>
                      <p className="text-2xl font-bold text-white">{stats.totalCourses}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Usuarios</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Lecciones</p>
                      <p className="text-2xl font-bold text-white">{stats.totalLessons}</p>
                    </div>
                    <Settings className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Comentarios</p>
                      <p className="text-2xl font-bold text-white">{stats.totalComments}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveView('courses')}
                    className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                  >
                    <BookOpen className="w-6 h-6 mx-auto mb-2" />
                    Gestionar Cursos
                  </button>
                  <button
                    onClick={() => setActiveView('users')}
                    className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                  >
                    <Users className="w-6 h-6 mx-auto mb-2" />
                    Gestionar Usuarios
                  </button>
                  <button
                    onClick={() => setActiveView('analytics')}
                    className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                  >
                    <BarChart3 className="w-6 h-6 mx-auto mb-2" />
                    Ver Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'courses' && (
            <CourseManagement onManageContent={handleManageContent} />
          )}

          {activeView === 'modules' && selectedCourse && (
            <ModuleManagement 
              courseId={selectedCourse.id} 
              courseName={selectedCourse.title}
              onBack={handleBackToCourses}
            />
          )}

          {activeView === 'users' && (
            <UserManagement />
          )}

          {activeView === 'banners' && (
            <BannerManagement />
          )}

          {activeView === 'analytics' && (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
              <p className="text-gray-400">Funcionalidad en desarrollo...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}