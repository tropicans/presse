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

  it('defines hybrid typography and spacing design tokens in :root', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('--primary-900: #000000')
    expect(cssContent).toContain('--font-family: \'Inter\'')
    expect(cssContent).toContain('--font-family-display: \'Playfair Display\'')
    expect(cssContent).toContain('--font-family-mono: \'JetBrains Mono\'')
    expect(cssContent).toContain('--radius-sm: 4px')
    expect(cssContent).toContain('--radius-md: 6px')
    expect(cssContent).toContain('--radius-lg: 8px')
    expect(cssContent).toContain('--radius-pill: 9999px')
    expect(cssContent).toContain('--space-1: 4px')
    expect(cssContent).toContain('--space-2: 8px')
    expect(cssContent).toContain('--space-4: 16px')
    expect(cssContent).toContain('--space-6: 24px')
    expect(cssContent).toContain('--space-8: 32px')
    expect(cssContent).toContain('--control-height-sm: 32px')
    expect(cssContent).toContain('--control-height-md: 36px')
    expect(cssContent).toContain('--sidebar-width: 230px')
    expect(cssContent).toContain('--header-height: 56px')
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

    // Dark mode tonal surface root overrides
    expect(cssContent).toContain("html[data-theme='dark'] {")
    expect(cssContent).toContain('--ledger-bg: #0b0d0e')
    expect(cssContent).toContain('--ledger-ink: #f4f4f6')
    expect(cssContent).toContain('--bg-app: #0b0d0e')
    expect(cssContent).toContain('--bg-surface: #13161a')
    expect(cssContent).toContain('--text-primary: #f4f4f6')
    expect(cssContent).toContain('--border-default: #272c35')

    // Dark mode body texture
    expect(cssContent).toContain("html[data-theme='dark'] body {")
    expect(cssContent).toContain('background-color: #0b0d0e')
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

  it('verifies standalone form preview and device stage dark mode parity', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain("html[data-theme='dark'] .editorial-preview-page-topbar {")
    expect(cssContent).toContain('.editorial-preview-device-stage .admin-preview-shell')
    expect(cssContent).toContain('.editorial-preview-device-stage .admin-preview-submit')
    expect(cssContent).toContain("html[data-theme='dark'] .editorial-preview-device-stage .admin-preview-submit")
    expect(cssContent).toContain('.admin-preview-note {')
    expect(cssContent).not.toContain('background: linear-gradient(180deg, #eef2ff')
  })
})
