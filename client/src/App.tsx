import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthBoot } from './hooks/useAuthBoot'
import { useEffect } from 'react'
import { trackPageview } from './api/analytics'

function AppLoading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-canvas">
      <p className="text-xs text-steel tracking-[0.04em] font-mono">LOADING…</p>
    </div>
  )
}

export default function App() {
  const { isReady } = useAuthBoot()

  useEffect(() => {
    if (!isReady) return

    const track = () => {
      const { pathname, search } = router.state.location
      trackPageview(`${pathname}${search}`)
    }

    track()
    return router.subscribe(track)
  }, [isReady])

  // Block the very first render until /me has resolved, so route guards
  // see the correct user state and don't bounce between /login and target.
  if (!isReady) {
    return <AppLoading />
  }

  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
}
