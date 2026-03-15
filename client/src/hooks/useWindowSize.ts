import { useState, useEffect } from 'react'

export function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    width,
    isMobile: width < 768,      // sidebar overlay, 2-col grids, small padding
    useHamburger: width < 1024, // navbar hamburger menu
  }
}
