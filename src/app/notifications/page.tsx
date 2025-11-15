'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Bell, MessageSquare, Check, CheckCheck, Trash2, ArrowLeft } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  comment_id?: string
  lesson_id?: string
  course_id?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications(notifications.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navegar a la página correspondiente
    if (notification.course_id && notification.lesson_id) {
      router.push(`/course/${notification.course_id}?lesson=${notification.lesson_id}`)
    } else if (notification.course_id) {
      router.push(`/course/${notification.course_id}`)
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Hace un momento'
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`
    return notificationDate.toLocaleDateString()
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <MainLayout activePage="notifications">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Cargando notificaciones...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout activePage="notifications">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Bell className="w-8 h-8" />
                  Notificaciones
                </h1>
                <p className="text-gray-400 mt-2">
                  {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  <CheckCheck className="w-5 h-5" />
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
          </div>

          {/* Lista de notificaciones */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No tienes notificaciones'}
              </h3>
              <p className="text-gray-400">
                {filter === 'unread'
                  ? 'Todas tus notificaciones han sido leídas'
                  : 'Cuando recibas notificaciones aparecerán aquí'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 transition-all hover:bg-white/10 hover:border-blue-500/50 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-500/10 border-blue-500/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div className={`p-3 rounded-xl ${
                      !notification.is_read
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      <MessageSquare className="w-6 h-6" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`font-semibold ${
                          !notification.is_read ? 'text-white' : 'text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-5 h-5 text-blue-400" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{getTimeAgo(notification.created_at)}</span>
                        {!notification.is_read && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            Nueva
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
