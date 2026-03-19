import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './app/routes'
import { useAuthStore } from './core/auth-store'
import { ToastContainer } from './shared/ui/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})

function AuthListener() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  useEffect(() => {
    const handler = () => {
      clearAuth()
      window.location.href = '/login'
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [clearAuth])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  )
}
