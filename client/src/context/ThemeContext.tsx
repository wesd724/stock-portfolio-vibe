import { createContext, useContext, useState } from 'react'

export interface Theme {
  bg: {
    root: string
    card: string
    input: string
    hover: string
  }
  border: string
  text: {
    primary: string
    secondary: string
    muted: string
  }
  up: string        // positive = RED (Korean convention)
  down: string      // negative = BLUE (Korean convention)
  upBg: string
  downBg: string
  accent: string
  overlay: string
}

export const darkTheme: Theme = {
  bg: {
    root: '#0f172a',
    card: '#1e293b',
    input: '#0f172a',
    hover: '#273549',
  },
  border: '#334155',
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',   // was #94a3b8, now brighter
    muted: '#94a3b8',       // was #475569, now brighter
  },
  up: '#ef4444',     // Korean: positive = red
  down: '#3b82f6',   // Korean: negative = blue
  upBg: '#450a0a',
  downBg: '#172554',
  accent: '#3b82f6',
  overlay: 'rgba(0,0,0,0.6)',
}

export const lightTheme: Theme = {
  bg: {
    root: '#f1f5f9',
    card: '#ffffff',
    input: '#f8fafc',
    hover: '#f1f5f9',
  },
  border: '#e2e8f0',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
  },
  up: '#dc2626',
  down: '#2563eb',
  upBg: '#fef2f2',
  downBg: '#eff6ff',
  accent: '#2563eb',
  overlay: 'rgba(0,0,0,0.4)',
}

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved !== 'light'
  })

  const toggleTheme = () => {
    setIsDark((prev) => {
      localStorage.setItem('theme', prev ? 'light' : 'dark')
      return !prev
    })
  }

  const theme = isDark ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
