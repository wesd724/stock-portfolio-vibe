import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesStore {
  symbols: string[]
  toggle: (symbol: string) => void
  isFavorite: (symbol: string) => boolean
}

export const useFavorites = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      symbols: [],
      toggle: (symbol) => {
        const current = get().symbols
        set({
          symbols: current.includes(symbol)
            ? current.filter((s) => s !== symbol)
            : [...current, symbol],
        })
      },
      isFavorite: (symbol) => get().symbols.includes(symbol),
    }),
    { name: 'stock-favorites' }
  )
)
