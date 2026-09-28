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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon.png"
      alt="Form"
      width={pixelSize}
      height={pixelSize}
      className="form-logo-img himpun-logo-svg"
      style={{
        width: pixelSize,
        height: pixelSize,
        flexShrink: 0,
        display: 'block',
        borderRadius: pixelSize >= 32 ? '8px' : '5px',
        objectFit: 'contain',
      }}
    />
  )

  if (!showText) {
    return (
      <div className={`himpun-logo-wrap form-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
        {mark}
      </div>
    )
  }

  return (
    <div
      className={`himpun-logo-brand form-logo-brand ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0, ...style }}
    >
      {mark}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <strong style={{ fontSize: pixelSize > 30 ? '1.4rem' : '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary, #0f172a)' }}>
          Form
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

export { HimpunLogo as FormLogo }

