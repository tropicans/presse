'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'isian-theme'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const syncTheme = (nextTheme: Theme) => {
      applyTheme(nextTheme)
      setTheme(nextTheme)
    }

    if (storedTheme === 'dark' || storedTheme === 'light') {
      syncTheme(storedTheme)
      return
    }

    syncTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        return
      }

      syncTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.25M12 19.25v2.25M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2.5 12h2.25M19.25 12h2.25M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3c-.08.53-.12 1.08-.12 1.64a9 9 0 0 0 9.91 8.15Z" />
          </svg>
        )}
      </span>
      <span className="theme-toggle-copy">{isDark ? 'Mode terang' : 'Mode gelap'}</span>
    </button>
  )
}
