// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const base = css.match(/\.sankara-button \{[^}]*\}/s)?.[0] ?? ''

describe('button stylesheet', () => {
  it('carries the structural declarations and nothing decorative', () => {
    expect(base).toContain('display: inline-flex')
    expect(base).toContain('align-items: center')
    expect(base).toContain('justify-content: center')
    expect(base).toContain('gap: 0.5rem')
    expect(base).toContain('cursor: pointer')
    // Links rendered as buttons are underlined by the UA without this.
    expect(base).toContain('text-decoration: none')
  })

  it('ships no appearance a consumer would have to override', () => {
    for (const property of [
      'background',
      'color:',
      'border-radius',
      'box-shadow',
      'font-weight',
      'padding',
      'transition',
    ]) {
      expect(base).not.toContain(property)
    }
  })

  it('draws a focus ring from the token, not from currentColor', () => {
    const focus = css.match(/\.sankara-button:focus-visible \{[^}]*\}/s)?.[0] ?? ''
    expect(focus).toContain('outline: 2px solid var(--color-focus)')
    expect(focus).toContain('outline-offset')
    // An outline sits outside the control, against the page — currentColor
    // would be invisible whenever the button's text matches the page.
    expect(focus).not.toContain('currentColor')
  })

  it('declares the focus token with a default', () => {
    expect(css).toMatch(/--color-focus:\s*var\(--color-primary\)/)
  })

  it('has no disabled rule — the native attribute needs no help', () => {
    expect(css).not.toContain('.sankara-button:disabled')
    expect(css).not.toContain('.sankara-button[aria-disabled')
  })
})
