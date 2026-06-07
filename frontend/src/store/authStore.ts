import { create } from 'zustand'
import api from '../lib/api'

interface User { id: string; email: string; fullName?: string; roles: string[] }

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  canWrite: () => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    sessionStorage.setItem('access_token', data.accessToken)
    await get().loadUser()
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    sessionStorage.removeItem('access_token')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  loadUser: async () => {
    const token = sessionStorage.getItem('access_token')
    if (!token) { set({ isLoading: false }); return }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch {
      sessionStorage.removeItem('access_token')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  hasRole: (role) => get().user?.roles.includes(role) ?? false,
  isAdmin: () => get().hasRole('Admin'),
  canWrite: () => get().hasRole('Admin') || get().hasRole('Accountant'),
}))
