/**
 * Estado de autenticación (Zustand).
 * Token y usuario se persisten en sessionStorage para reducir riesgo XSS
 * y no exponer token en pestañas largas (sessionStorage se limpia al cerrar pestaña).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'vet-auth'

export interface UserInfo {
  userId: number
  empresaId: number
  rolId: number
  email?: string
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  setAuth: (token: string, user: UserInfo) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
)

export function getToken(): string | null {
  return useAuthStore.getState().token
}

export function clearAuth(): void {
  useAuthStore.getState().clearAuth()
}
