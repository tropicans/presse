import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('Mobile layout and preview overflow bug reproduction', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')

  it('scroll-top-btn in mobile preview should not have width: 100%', () => {
    // BUG REPRODUCTION:
    // .editorial-preview-device-stage.mobile .scroll-top-btn had width: 100% combined with position: fixed.
    // This caused it to stretch across the preview card, stick out beyond the card bounds,
    // and overlay the navigation buttons.
    const mobileStageBtnMatch = cssContent.match(
      /\.editorial-preview-device-stage\.mobile[^{]*\.scroll-top-btn[^{]*\{[^}]*\}/
    )
    if (mobileStageBtnMatch) {
      expect(mobileStageBtnMatch[0]).not.toContain('width: 100%')
    }
  })

  it('form-navigation-shell in mobile media query should not have negative margin-inline bleeding out of card', () => {
    // BUG REPRODUCTION:
    // @media (max-width: 640px) had .form-navigation-shell with `margin-inline: -16px; margin-bottom: -24px;`.
    // This caused the navigation buttons and container to break outside the card border.
    const mobileNavMatch = cssContent.match(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.form-navigation-shell\s*\{([^}]*)\}/
    )
    expect(mobileNavMatch).not.toBeNull()
    const rules = mobileNavMatch![1]
    expect(rules).not.toMatch(/margin-inline:\s*-[0-9]+px/)
  })

  it('admin-preview-body should have constrained grid columns and min-width to prevent overflow blowout', () => {
    // BUG REPRODUCTION:
    // .admin-preview-body had `display: grid;` with implicit `auto` columns and no `min-width: 0`.
    // When containing elements like radio-group or 21-step indicators, the grid column blows out past the card.
    expect(cssContent).toMatch(
      /\.admin-preview-body\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    )
    expect(cssContent).toMatch(
      /\.admin-preview-body\s*\{[^}]*min-width:\s*0/
    )
  })

  it('form-step-dots should allow wrapping to prevent horizontal blowout on many steps', () => {
    // BUG REPRODUCTION:
    // .form-step-dots has 21 steps * 12px + 20 * 6px = 372px.
    // Without flex-wrap: wrap, it forces horizontal overflow on mobile screens (< 380px).
    expect(cssContent).toMatch(
      /\.form-step-dots\s*\{[^}]*flex-wrap:\s*wrap/
    )
  })

  it('editorial-preview-device-stage.mobile rules should not be overridden by subsequent desktop stage selectors', () => {
    // BUG REPRODUCTION:
    // .editorial-preview-device-stage.mobile .admin-preview-body was placed BEFORE
    // .editorial-preview-device-stage .admin-preview-body in globals.css, causing mobile padding
    // to be completely overridden by 28px desktop padding.
    const mobileIndex = cssContent.indexOf('.editorial-preview-device-stage.mobile .admin-preview-body')
    const generalIndex = cssContent.indexOf('.editorial-preview-device-stage .admin-preview-body')
    expect(mobileIndex).toBeGreaterThan(generalIndex)
  })
})
