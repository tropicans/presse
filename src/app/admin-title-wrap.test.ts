import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('Admin title display and wrapping constraints', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
  const editorPath = path.resolve(process.cwd(), 'src/components/AdminFormEditor.tsx')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  const editorContent = fs.readFileSync(editorPath, 'utf8')

  it('guarantees breadcrumbs have word-break and overflow-wrap to prevent title clipping', () => {
    // Both link and current breadcrumb should break words safely
    expect(cssContent).toMatch(/\.admin-breadcrumb-link,\s*\.admin-breadcrumb-current\s*\{[^}]*overflow-wrap:\s*(break-word|anywhere)/)
    expect(cssContent).toMatch(/\.admin-breadcrumb-link,\s*\.admin-breadcrumb-current\s*\{[^}]*word-break:\s*(break-word|normal)/)
  })

  it('ensures admin builder grid adapts responsively to avoid horizontal overflow on intermediate screens', () => {
    // Should have intermediate responsive breakpoint for tablet / laptop
    expect(cssContent).toContain('@media (max-width: 1200px)')
    expect(cssContent).toContain('@media (max-width: 900px)')
  })

  it('ensures editorial form editor shell and content do not cause unconstrained horizontal overflow', () => {
    expect(cssContent).toMatch(/\.editorial-form-editor-shell\s*\{[^}]*overflow-x:\s*(clip|hidden)/)
  })

  it('ensures the form title field in AdminFormEditor allows multi-line viewing without clipping', () => {
    // Should use a textarea or multi-line element for the form title so long titles are not truncated
    expect(editorContent).toMatch(/<textarea[\s\S]*?value=\{form\.title\}[\s\S]*?className="admin-builder-textarea admin-builder-title-textarea"/)
  })

  it('ensures dashboard table title and statusbar title break words properly', () => {
    expect(cssContent).toMatch(/\.forms-dashboard-table-title\s*\{[^}]*overflow-wrap:\s*(break-word|anywhere)/)
    expect(cssContent).toMatch(/\.editorial-form-editor-statusbar strong\s*\{[^}]*overflow-wrap:\s*(break-word|anywhere)/)
  })
})
