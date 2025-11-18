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
      (event, session) => {
        console.log('[AUTH] Event:', event, 'User:', !!session?.user)

        if (!mounted) return

        setUser(session?.user ?? null)

        // Set loading to false IMMEDIATELY - don't wait for profile
        if (mounted) {
          clearTimeout(fallbackTimeout)
          setLoading(false)
          console.log('[AUTH] ✓ Loading set to FALSE')
        }

        // Fetch profile asynchronously (don't block auth loading)
        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (mounted && data) {
                setProfile(data)
                console.log('[AUTH] Profile loaded')
              }
            })
            .catch((error) => {
              console.error('[AUTH] Profile fetch error:', error)
            })
        } else {
          setProfile(null)
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
