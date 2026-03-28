import { useNavigate, useLocation } from 'react-router-dom'

export type Page = 'home' | 'portfolio' | 'transactions' | 'compare' | 'screener' | 'favorites' | 'help' | 'investment'

const pageToPath: Record<Page, string> = {
  home: '/',
  portfolio: '/portfolio',
  transactions: '/transactions',
  compare: '/compare',
  screener: '/screener',
  favorites: '/favorites',
  help: '/help',
  investment: '/investment',
}

const pathToPage: Record<string, Page> = {
  '/': 'home',
  '/portfolio': 'portfolio',
  '/transactions': 'transactions',
  '/compare': 'compare',
  '/screener': 'screener',
  '/favorites': 'favorites',
  '/help': 'help',
  '/investment': 'investment',
}

export function useNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPage = pathToPage[location.pathname] ?? 'home'

  const setPage = (page: Page) => {
    navigate(pageToPath[page])
  }

  return { currentPage, setPage }
}
