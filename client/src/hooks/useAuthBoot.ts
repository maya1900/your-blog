import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/auth'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Boot-time profile fetch. Runs only when a token exists.
 * Keeps zustand `user` in sync with the latest server-side profile.
 */
export function useAuthBoot() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)

  const query = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    if (query.data) setUser(query.data)
  }, [query.data, setUser])

  return {
    isReady: !token || !query.isLoading,
  }
}
