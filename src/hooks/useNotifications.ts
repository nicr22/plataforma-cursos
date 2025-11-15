'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  type: 'comment_reply' | 'comment_mention'
  title: string
  message: string
  comment_id: string | null
  lesson_id: string | null
  course_id: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Cargar notificaciones
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // Si la tabla no existe aún, simplemente ignorar el error silenciosamente
      if (error) {
        // Error de tabla no existe (código PostgreSQL 42P01)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setNotifications([])
          setUnreadCount(0)
          setLoading(false)
          return
        }
        throw error
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      // Silenciar errores si la tabla no existe
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Marcar como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [user])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [user])

  // Eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const notification = notifications.find(n => n.id === notificationId)

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Actualizar estado local
      setNotifications(prev => prev.filter(n => n.id !== notificationId))

      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [user, notifications])

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return

    fetchNotifications()

    // Suscribirse a nuevas notificaciones en tiempo real (solo si la tabla existe)
    let subscription: ReturnType<typeof supabase.channel> | null = null

    try {
      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
          }
        )
        .subscribe()
    } catch (error) {
      // Ignorar errores de suscripción si la tabla no existe
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [user, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  }
}
