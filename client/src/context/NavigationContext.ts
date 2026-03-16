import { create } from 'zustand'

export type Page = 'home' | 'portfolio' | 'transactions' | 'compare' | 'screener' | 'favorites' | 'help' | 'investment'

interface NavigationStore {
  currentPage: Page
  setPage: (page: Page) => void
}

export const useNavigation = create<NavigationStore>((set) => ({
  currentPage: 'home',
  setPage: (page) => set({ currentPage: page }),
}))
