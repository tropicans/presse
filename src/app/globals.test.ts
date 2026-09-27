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

  it('defines monochrome design tokens in :root', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('--primary-900: #09090b')
    expect(cssContent).toContain('--ledger-bg: #fafafa')
    expect(cssContent).toContain('--ledger-primary-fixed: #27272a')
  })
})
