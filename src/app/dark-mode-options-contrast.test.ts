import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('Dark mode form options contrast (UI bug reproduction)', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')

  it('ensures searchable-select options do not use dark font color in dark mode', () => {
    // In dark mode html[data-theme='dark'], --gray-200 is #1e1e1e (near black).
    // The previous bug had: html[data-theme='dark'] .searchable-select-option { color: var(--gray-200); }
    // which caused option text to be invisible against dark dropdown background #1c2026.
    expect(cssContent).not.toMatch(
      /html\[data-theme=['"]dark['"]\]\s+\.searchable-select-option\s*\{[^}]*color:\s*var\(--gray-200\)/
    )

    // Option text must be explicitly light in dark mode
    expect(cssContent).toMatch(
      /html\[data-theme=['"]dark['"]\]\s+\.searchable-select-option\s*\{[^}]*color:\s*(var\(--(text-primary|ledger-ink|gray-100|gray-900)[^)]*\)|#[fF]{3,6})/
    )
  })

  it('ensures searchable-select selected option does not use dark font in dark mode', () => {
    // In dark mode, --primary-300 is #2e2e2e.
    // The previous bug had: color: var(--primary-300) for selected options.
    expect(cssContent).not.toMatch(
      /html\[data-theme=['"]dark['"]\]\s+\.searchable-select-option\.selected\s*\{[^}]*color:\s*var\(--primary-300\)/
    )

    expect(cssContent).toMatch(
      /html\[data-theme=['"]dark['"]\]\s+\.searchable-select-option\.selected\s*\{[^}]*color:\s*(var\(--(text-primary|ledger-ink|primary-900|gray-100|gray-900)[^)]*\)|#[fF]{3,6})/
    )
  })

  it('ensures native select options have explicit dark theme styling to prevent OS white-on-white / black-on-black popup bugs', () => {
    // Native <option> elements in dark mode must specify dark background and light font
    expect(cssContent).toMatch(
      /html\[data-theme=['"]dark['"]\]\s+option\s*\{[^}]*background(-color)?:\s*[^;]+;/
    )
    expect(cssContent).toMatch(
      /html\[data-theme=['"]dark['"]\]\s+option\s*\{[^}]*color:\s*[^;]+;/
    )
  })

  it('ensures Likert checked options in dark mode do not render black text on dark background', () => {
    // In dark mode, .likert-option:has(.radio-input:checked) on public ledger has dark background,
    // but .likert-text had color: var(--white) which resolved to #000000 in dark mode.
    expect(cssContent).toMatch(
      /html\[data-theme=['"]dark['"]\][\s\S]*?\.likert-option:has\(\.radio-input:checked\)\s+\.likert-text[\s\S]*?\{[^}]*color:\s*(var\(--(text-primary|ledger-ink|public-text)[^)]*\)|#[fF]{3,6})/
    )
  })
})
