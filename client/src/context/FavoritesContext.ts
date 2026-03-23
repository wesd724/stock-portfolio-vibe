import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FavoritesGroup {
  id: string
  name: string
  symbols: string[]
}

interface FavoritesStore {
  groups: FavoritesGroup[]
  toggle: (symbol: string, groupId?: string) => void
  isFavorite: (symbol: string) => boolean
  addGroup: (name: string) => void
  removeGroup: (id: string) => void
  renameGroup: (id: string, name: string) => void
  moveToGroup: (symbol: string, fromGroupId: string, toGroupId: string) => void
  reorderSymbols: (groupId: string, symbols: string[]) => void
  reorderGroups: (groups: FavoritesGroup[]) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export const useFavorites = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      groups: [{ id: 'default', name: '기본', symbols: [] }],

      toggle: (symbol, groupId) => {
        const groups = get().groups
        const existingGroup = groups.find((g) => g.symbols.includes(symbol))
        if (existingGroup) {
          set({
            groups: groups.map((g) =>
              g.id === existingGroup.id
                ? { ...g, symbols: g.symbols.filter((s) => s !== symbol) }
                : g
            ),
          })
        } else {
          const targetId = groupId ?? groups[0]?.id ?? 'default'
          set({
            groups: groups.map((g) =>
              g.id === targetId ? { ...g, symbols: [...g.symbols, symbol] } : g
            ),
          })
        }
      },

      isFavorite: (symbol) => get().groups.some((g) => g.symbols.includes(symbol)),

      addGroup: (name) => {
        set({ groups: [...get().groups, { id: generateId(), name, symbols: [] }] })
      },

      removeGroup: (id) => {
        const groups = get().groups
        const group = groups.find((g) => g.id === id)
        if (!group) return
        const remaining = groups.filter((g) => g.id !== id)
        if (remaining.length === 0) {
          set({ groups: [{ id: 'default', name: '기본', symbols: [] }] })
        } else if (group.symbols.length > 0) {
          set({
            groups: remaining.map((g, i) =>
              i === 0 ? { ...g, symbols: [...g.symbols, ...group.symbols] } : g
            ),
          })
        } else {
          set({ groups: remaining })
        }
      },

      renameGroup: (id, name) => {
        set({ groups: get().groups.map((g) => (g.id === id ? { ...g, name } : g)) })
      },

      reorderSymbols: (groupId, symbols) => {
        set({ groups: get().groups.map((g) => g.id === groupId ? { ...g, symbols } : g) })
      },

      reorderGroups: (groups) => set({ groups }),

      moveToGroup: (symbol, fromGroupId, toGroupId) => {
        if (fromGroupId === toGroupId) return
        set({
          groups: get().groups.map((g) => {
            if (g.id === fromGroupId) return { ...g, symbols: g.symbols.filter((s) => s !== symbol) }
            if (g.id === toGroupId) return { ...g, symbols: [...g.symbols, symbol] }
            return g
          }),
        })
      },
    }),
    {
      name: 'stock-favorites',
      version: 2,
      migrate: (persistedState: any, version) => {
        if (version < 2) {
          const oldSymbols: string[] = persistedState?.symbols ?? []
          return { groups: [{ id: 'default', name: '기본', symbols: oldSymbols }] }
        }
        return persistedState
      },
    }
  )
)
