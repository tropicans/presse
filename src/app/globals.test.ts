import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('CSS layout constraints', () => {
  it('form-card should not clip its children (overflow should be visible) to prevent dropdown clipping', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    // Find the definition of .form-card in css
    // Check if it contains overflow: hidden
    const formCardMatch = cssContent.match(/\.form-card\s*\{[^}]*\}/)
    expect(formCardMatch).not.toBeNull()

    const formCardBody = formCardMatch![0]
    expect(formCardBody).not.toContain('overflow: hidden')
  })

  it('defines editorial monochrome design tokens in :root', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('--primary-900: #000000')
    expect(cssContent).toContain('--ledger-bg: #ffffff')
    expect(cssContent).toContain('--ledger-primary-fixed: #1e1e1e')
    expect(cssContent).toContain('--font-family: \'Source Serif 4\'')
    expect(cssContent).toContain('--font-family-display: \'Playfair Display\'')
    expect(cssContent).toContain('--font-family-mono: \'JetBrains Mono\'')
    expect(cssContent).toContain('--radius-sm: 0px')
    expect(cssContent).toContain('--radius-md: 0px')
    expect(cssContent).toContain('--radius-lg: 0px')
    expect(cssContent).toContain('--radius-xl: 0px')
    expect(cssContent).toContain('--shadow-sm: none')
    expect(cssContent).toContain('--shadow-md: none')
    expect(cssContent).toContain('--line-hairline: 1px')
    expect(cssContent).toContain('--line-medium: 2px')
    expect(cssContent).toContain('--line-heavy: 4px')
    expect(cssContent).toContain('--line-ultra: 8px')
  })

  it('enforces global zero-radius rule', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('border-radius: 0px !important')
  })

  it('guarantees zero residual teal or cyan color remnants in globals.css', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).not.toContain('#00796b')
    expect(cssContent).not.toContain('#80cbc4')
    expect(cssContent).not.toContain('rgba(0, 121, 107')
  })

  it('verifies public form and success screen editorial styles', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('.form-card {')
    expect(cssContent).toContain('border: 2px solid var(--primary-900)')
    expect(cssContent).toContain('.radio-label:has(.radio-input:checked)')
    expect(cssContent).toContain('.submit-btn {')
    expect(cssContent).toContain('.success-card {')
    expect(cssContent).toContain('.success-title {')
    expect(cssContent).toContain('border-bottom: 4px solid var(--primary-900)')
  })

  it('verifies admin suite and form builder editorial minimalist styles (EDIT-08)', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    // Admin table header and monospace count badge
    expect(cssContent).toContain('.admin-count-badge {')
    expect(cssContent).toContain('.forms-dashboard-table thead th {')
    expect(cssContent).toContain('.editorial-form-editor-panel {')
    expect(cssContent).toContain('.admin-step-tab {')
    expect(cssContent).toContain('.submissions-dashboard-card {')
    expect(cssContent).toContain('.submissions-dashboard-participant-chip {')
  })

  it('verifies dual-theme parity and dark mode contrast tokens (EDIT-09)', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    // Dark mode pure monochrome root overrides
    expect(cssContent).toContain("html[data-theme='dark'] {")
    expect(cssContent).toContain('--ledger-bg: #000000')
    expect(cssContent).toContain('--ledger-ink: #ffffff')
    expect(cssContent).toContain('--bg-app: #000000')
    expect(cssContent).toContain('--bg-surface: #000000')
    expect(cssContent).toContain('--text-primary: #ffffff')
    expect(cssContent).toContain('--border-focus: #ffffff')

    // Dark mode body texture
    expect(cssContent).toContain("html[data-theme='dark'] body {")
    expect(cssContent).toContain('background-color: #000000')
  })

  it('verifies analytics dashboard design system classes (ANLY-01 to ANLY-04)', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('.analytics-shell {')
    expect(cssContent).toContain('.analytics-metric-card {')
    expect(cssContent).toContain('.analytics-chart-panel {')
    expect(cssContent).toContain('.analytics-question-card {')
    expect(cssContent).toContain('.analytics-option-meter {')
  })
})
