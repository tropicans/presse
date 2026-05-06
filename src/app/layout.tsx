import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'isian',
  description: 'Platform pengelolaan formulir publik, kiriman, dan dashboard admin isian.',
}

const themeScript = `(() => {
  try {
    const storageKey = 'isian-theme'
    const storedTheme = window.localStorage.getItem(storageKey)
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : systemPrefersDark
        ? 'dark'
        : 'light'

    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  } catch {}
})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
        <ThemeToggle />
      </body>
    </html>
  )
}
