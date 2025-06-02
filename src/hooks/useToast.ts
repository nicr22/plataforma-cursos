import { useState, useCallback } from 'react'
import { Toast, ToastType } from '@/components/ui/Toast'

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration: duration || 5000
    }

    setToasts((prev) => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    addToast('success', title, message)
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast('error', title, message)
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast('warning', title, message)
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast('info', title, message)
  }, [addToast])

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  }
}