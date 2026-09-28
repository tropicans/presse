import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: {
    default: 'Form',
    template: '%s | Form',
  },
  description: 'Platform pengelolaan formulir publik, kiriman, dan dashboard admin Form.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
}

const themeScript = `(() => {
  try {
    const storageKey = 'isian-theme'
    const storedTheme = window.localStorage.getItem(storageKey)
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : 'dark'

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
