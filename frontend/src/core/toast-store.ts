/**
 * Store global de notificaciones (toasts).
 * Uso: toast.success('Guardado'), toast.error('Algo falló'), etc.
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

const AUTO_DISMISS_MS = 4500

interface ToastState {
  toasts: ToastItem[]
  add: (type: ToastType, message: string, options?: { duration?: number }) => void
  remove: (id: string) => void
  clear: () => void
}

let timeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map()

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: (type, message, options = {}) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const duration = options.duration ?? AUTO_DISMISS_MS

    const item: ToastItem = {
      id,
      type,
      message,
      createdAt: Date.now(),
    }

    set((state) => ({ toasts: [...state.toasts, item] }))

    const timeoutId = setTimeout(() => {
      get().remove(id)
      timeoutIds.delete(id)
    }, duration)
    timeoutIds.set(id, timeoutId)
  },

  remove: (id) => {
    const tid = timeoutIds.get(id)
    if (tid) {
      clearTimeout(tid)
      timeoutIds.delete(id)
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clear: () => {
    timeoutIds.forEach((id) => clearTimeout(id))
    timeoutIds = new Map()
    set({ toasts: [] })
  },
}))

export const toast = {
  success: (message: string, options?: { duration?: number }) =>
    useToastStore.getState().add('success', message, options),
  error: (message: string, options?: { duration?: number }) =>
    useToastStore.getState().add('error', message, options),
  info: (message: string, options?: { duration?: number }) =>
    useToastStore.getState().add('info', message, options),
  warning: (message: string, options?: { duration?: number }) =>
    useToastStore.getState().add('warning', message, options),
}
