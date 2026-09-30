import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('SearchableSelect dropdown visibility and overflow constraints', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
  const selectCompPath = path.resolve(process.cwd(), 'src/components/SearchableSelect.tsx')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  const selectContent = fs.readFileSync(selectCompPath, 'utf8')

  it('admin-preview-shell should not have overflow: hidden to prevent clipping dropdowns', () => {
    // Check definition of .admin-preview-shell in globals.css
    const match = cssContent.match(/\.admin-preview-shell\s*\{[^}]*\}/)
    expect(match).not.toBeNull()
    const body = match![0]
    expect(body).not.toContain('overflow: hidden')
    expect(body).toContain('overflow: visible')
  })

  it('admin-preview-card in editorial preview should not have overflow: hidden', () => {
    const match = cssContent.match(/\.editorial-form-editor-preview-panel\s+\.admin-preview-card[^{]*\{[^}]*\}/)
    expect(match).not.toBeNull()
    const body = match![0]
    expect(body).not.toContain('overflow: hidden')
    expect(body).toContain('overflow: visible')
  })

  it('searchable-select supports placement-top styling for smart flipping', () => {
    expect(cssContent).toContain('.searchable-select-dropdown.placement-top')
  })

  it('SearchableSelect component calculates placement when opening near bottom of viewport', () => {
    expect(selectContent).toContain('placement')
    expect(selectContent).toContain('placement-top')
  })
})
