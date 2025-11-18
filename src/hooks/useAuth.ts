'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User as AppUser } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initAuth = async () => {
      try {
        console.log('[AUTH] Starting initAuth...')

        // Safety timeout - force loading to false after 3 seconds
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('[AUTH] TIMEOUT - forcing loading to false after 3s')
            setLoading(false)
          }
        }, 3000)

        const { data: { session } } = await supabase.auth.getSession()
        console.log('[AUTH] Session fetched:', !!session?.user)

        if (!mounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[AUTH] Fetching profile...')
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (mounted && data) {
            setProfile(data)
            console.log('[AUTH] Profile loaded')
          }
        }

        if (mounted) {
          clearTimeout(timeoutId)
          console.log('[AUTH] ✓ READY - setting loading to FALSE')
          setLoading(false)
        }
      } catch (error) {
        console.error('[AUTH] Error:', error)
        if (mounted) {
          clearTimeout(timeoutId)
          console.log('[AUTH] ✗ ERROR - setting loading to FALSE anyway')
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[AUTH] State changed:', _event)
        if (!mounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (mounted && data) {
            setProfile(data)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  }
}
