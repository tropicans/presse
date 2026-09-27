import React from 'react'

export interface HimpunLogoProps {
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
  showText?: boolean
  subtitle?: string
  style?: React.CSSProperties
}

const SIZE_MAP = {
  sm: 20,
  md: 28,
  lg: 44,
}

export default function HimpunLogo({
  size = 'md',
  className = '',
  showText = false,
  subtitle,
  style,
}: HimpunLogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] ?? 28

  const mark = (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="himpun-logo-svg"
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="himpun-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="himpun-bar-l" x1="7" y1="7" x2="12" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="himpun-bar-r" x1="20" y1="7" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="himpun-accent" x1="9" y1="13" x2="23" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#himpun-bg)" />
      <rect x="7" y="7" width="5" height="18" rx="2.5" fill="url(#himpun-bar-l)" />
      <rect x="20" y="7" width="5" height="18" rx="2.5" fill="url(#himpun-bar-r)" />
      <path
        d="M9 13.5C9 13.5 13.5 16 16 16C18.5 16 23 13.5 23 13.5V18.5C23 18.5 18.5 21 16 21C13.5 21 9 18.5 9 18.5Z"
        fill="url(#himpun-accent)"
        fillOpacity="0.92"
      />
      <circle cx="16" cy="16" r="2.2" fill="#ffffff" />
    </svg>
  )

  if (!showText) {
    return (
      <div className={`himpun-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
        {mark}
      </div>
    )
  }

  return (
    <div
      className={`himpun-logo-brand ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0, ...style }}
    >
      {mark}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <strong style={{ fontSize: pixelSize > 30 ? '1.4rem' : '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary, #0f172a)' }}>
          HIMPUN
        </strong>
        {subtitle && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
