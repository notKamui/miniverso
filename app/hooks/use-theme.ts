import { $setTheme } from '@server/functions/theme'
import { useServerFn } from '@tanstack/start'
import { createContext, use } from 'react'

export const ThemeContext = createContext<{ theme: 'light' | 'dark' }>({
  theme: 'dark',
})

export function useTheme() {
  const context = use(ThemeContext)
  const setTheme = useServerFn($setTheme)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return { ...context, setTheme }
}
