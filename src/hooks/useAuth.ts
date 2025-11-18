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

    // Set loading to false after 2 seconds as fallback
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.log('[AUTH] Fallback timeout - setting loading to FALSE')
        setLoading(false)
      }
    }, 2000)

    // Listen to auth changes - this is the PRIMARY source of auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] Event:', event, 'User:', !!session?.user, 'Mounted:', mounted)

        if (!mounted) {
          console.log('[AUTH] Component unmounted, skipping')
          return
        }

        console.log('[AUTH] Setting user to:', !!session?.user)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[AUTH] Fetching profile for user:', session.user.id.substring(0, 8))
          // Fetch profile
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          console.log('[AUTH] Profile fetch result:', { hasData: !!data, hasError: !!error })

          if (mounted && data) {
            setProfile(data)
            console.log('[AUTH] Profile set')
          }
        } else {
          setProfile(null)
          console.log('[AUTH] No user, profile set to null')
        }

        // Always set loading to false after auth state change
        if (mounted) {
          clearTimeout(fallbackTimeout)
          console.log('[AUTH] ✓ About to set loading to FALSE')
          setLoading(false)
          console.log('[AUTH] ✓ Loading set to FALSE')
        }
      }
    )

    // Try getSession but don't block on it (Chrome issue workaround)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      console.log('[AUTH] getSession resolved:', !!session?.user)

      if (session?.user && !user) {
        setUser(session.user)

        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (mounted && data) {
              setProfile(data)
            }
          })
      }

      if (mounted) {
        clearTimeout(fallbackTimeout)
        setLoading(false)
      }
    }).catch((error) => {
      console.error('[AUTH] getSession error:', error)
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(fallbackTimeout)
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
