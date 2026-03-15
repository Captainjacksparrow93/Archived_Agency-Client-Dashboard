import { create } from 'zustand'

interface User {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  role: string
  employeeRole?: string
  wallet?: { id: string; balance: number }
}

interface AppState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  updateBalance: (balance: number) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  updateBalance: (balance) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, wallet: { ...state.user.wallet!, balance } }
        : null,
    })),
}))
