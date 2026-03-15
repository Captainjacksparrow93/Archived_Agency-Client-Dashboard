'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'

export function useAuth(requireAuth = true) {
  const { user, isLoading, setUser, setLoading } = useStore()
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
          if (requireAuth) router.push('/')
        }
      } catch {
        setUser(null)
        if (requireAuth) router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' })
    setUser(null)
    router.push('/')
  }

  return { user, isLoading, logout }
}
