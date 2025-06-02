// ============================================
// ARCHIVO: src/components/layout/MainLayout.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoginForm from '@/components/auth/LoginForm'
import { supabase } from '@/lib/supabase'
import { 
  Search, 
  User, 
  LogOut, 
  Settings,
  Home,
  BookOpen,
  TrendingUp,
  Users,
  MessageCircle,
  Star,
  Bell,
  Menu,
  UserCircle,
  Play,
  Award,
  Clock
} from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  useEffect(() => {
    if (user && profile) {
      setIsAdmin(profile.role === 'admin')
    }
    
    // Detectar página activa basada en la URL
    const path = window.location.pathname
    if (path === '/') setActivePage('dashboard')  
    else if (path === '/courses') setActivePage('courses')
    else if (path === '/progress') setActivePage('progress')
    else if (path === '/community') setActivePage('community')
    else if (path === '/chat') setActivePage('chat')
    else if (path === '/favorites') setActivePage('favorites')
    else if (path === '/profile') setActivePage('profile')
  }, [user, profile])

  const handleLogout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Error during logout:', error)
        return
      }
      router.push('/')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Home, 
      path: '/',
      active: activePage === 'dashboard',
      badge: null
    },
    { 
      id: 'courses', 
      label: 'Mis Cursos', 
      icon: BookOpen, 
      path: '/courses',
      active: activePage === 'courses',
      badge: null
    },
    { 
      id: 'progress', 
      label: 'Mi Progreso', 
      icon: TrendingUp, 
      path: '/progress',
      active: activePage === 'progress',
      badge: null
    },
    { 
      id: 'community', 
      label: 'Comunidad', 
      icon: Users, 
      path: '/community',
      active: activePage === 'community',
      badge: '3'
    },
    { 
      id: 'chat', 
      label: 'Mensajes', 
      icon: MessageCircle, 
      path: '/chat',
      active: activePage === 'chat',
      badge: '2'
    },
    { 
      id: 'favorites', 
      label: 'Favoritos', 
      icon: Star, 
      path: '/favorites',
      active: activePage === 'favorites',
      badge: null
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-red-300 border-t-transparent rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-white text-xl font-semibold">EduPlatform</div>
          <div className="text-gray-400 text-sm mt-2">Cargando tu experiencia de aprendizaje...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex">
      {/* Sidebar Estilo Netflix */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-gray-900 via-gray-800 to-black transition-all duration-300 flex flex-col border-r border-gray-700 shadow-2xl`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <Play className="text-white w-5 h-5" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="text-white font-bold text-xl tracking-tight">EduPlatform</span>
                <div className="text-red-400 text-xs font-medium">Tu plataforma de aprendizaje</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {sidebarOpen && (
          <div className="p-6 border-b border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-300">Cursos</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">3</div>
              </div>
              <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 p-3 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-300">Horas</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">24</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id)
                    router.push(item.path)
                  }}
                  className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                    item.active
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:scale-105'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 z-10" />
                  {sidebarOpen && (
                    <>
                      <span className="font-medium z-10">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-red-500/0 group-hover:from-red-600/10 group-hover:to-red-500/5 transition-all duration-300"></div>
                </button>
              )
            })}
          </div>

          {/* Profile Section */}
          <div className="mt-6">
            <div className="text-gray-400 text-xs uppercase font-semibold mb-3 px-4 tracking-wider">
              {sidebarOpen ? 'Personal' : ''}
            </div>
            <button
              onClick={() => {
                setActivePage('profile')
                router.push('/profile')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                activePage === 'profile'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:scale-105'
              }`}
            >
              <UserCircle className="w-5 h-5 flex-shrink-0 z-10" />
              {sidebarOpen && (
                <span className="font-medium z-10">Mi Perfil</span>
              )}
              {/* Hover effect background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-purple-500/0 group-hover:from-purple-600/10 group-hover:to-purple-500/5 transition-all duration-300"></div>
            </button>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-gray-400 text-xs uppercase font-semibold mb-3 px-4 tracking-wider">
                {sidebarOpen ? 'Administración' : ''}
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-500 hover:text-white transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">Panel Admin</span>}
              </button>
            </div>
          )}
        </nav>

        {/* User Section - CON BOTÓN DE CERRAR SESIÓN BIEN VISIBLE */}
        <div className="p-4 border-t border-gray-700 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          {/* Información del Usuario */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-800/30 border border-gray-600/30">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-gray-400 text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}
                </div>
              </div>
            )}
          </div>
          
          {/* Botón de Cerrar Sesión - MUY VISIBLE */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30 transition-all duration-200 border border-gray-600/30 hover:shadow-lg"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area - SIN HEADER BLANCO */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* HEADER COMENTADO - NO SE MUESTRA */}
        {/*
        <header className="bg-gradient-to-r from-black/80 via-gray-900/80 to-black/80 backdrop-blur-md border-b border-gray-700/50 px-8 py-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200 border border-gray-700/50"
              >
                <Menu className="w-5 h-5 text-gray-300" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  ¡Bienvenido de vuelta, {profile?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-400 mt-1">
                  Continúa tu aprendizaje donde lo dejaste
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar cursos, instructores..."
                  className="pl-12 pr-6 py-3 w-96 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 hover:bg-gray-800/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="relative p-3 hover:bg-gray-800/50 rounded-xl transition-all duration-200 border border-gray-700/30">
                <Bell className="w-6 h-6 text-gray-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-red-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">3</span>
                </span>
              </button>

              <div className="flex items-center gap-4 p-2 rounded-xl bg-gray-800/30 border border-gray-600/30">
                <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-white">
                    {profile?.full_name || user?.email}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        */}

        {/* Main Content - AHORA OCUPA TODA LA PANTALLA */}
        <main className="flex-1 p-8 bg-gradient-to-b from-gray-900/50 to-black/30">
          {children}
        </main>
      </div>
    </div>
  )
}