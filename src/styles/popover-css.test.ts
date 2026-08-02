// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const PLACEMENTS = [
  ['bottom-start', 'block-end span-inline-end'],
  ['bottom', 'block-end span-all'],
  ['bottom-end', 'block-end span-inline-start'],
  ['top-start', 'block-start span-inline-end'],
  ['top', 'block-start span-all'],
  ['top-end', 'block-start span-inline-start'],
] as const

describe('popover stylesheet', () => {
  it.each(PLACEMENTS)('maps %s to %s', (placement, area) => {
    const rule = css.match(
      new RegExp(`\\[data-placement=(['"])${placement}\\1\\][^}]*}`, 's')
    )
    expect(rule?.[0]).toContain(`position-area: ${area}`)
  })

  it('centres the centred placements with anchor-center', () => {
    for (const placement of ['bottom', 'top'] as const) {
      const rule = css.match(
        new RegExp(`\\[data-placement=(['"])${placement}\\1\\][^}]*}`, 's')
      )
      expect(rule?.[0]).toContain('justify-self: anchor-center')
    }
  })

  it('gates the anchored branch on both anchor properties', () => {
    const supports = css.match(/@supports \([^)]*position-anchor[^{]*{/)?.[0]
    expect(supports).toBeTruthy()
    expect(supports).toContain('position-area')
  })

  it('overrides the UA popover centring in the fallback', () => {
    const base = css.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(base).toContain('inset: auto 0 0 0')
    expect(base).toContain('margin: 0')
    expect(base).toMatch(/max-block-size: \d+svh/)
    expect(base).toContain('overflow: auto')
  })

  it('clears the fallback safe-area padding in the anchored branch', () => {
    // Lazy match up to the first line that closes flush at column 0 — nested
    // rule braces are indented, so this is the @supports block's own close.
    const supports = css.match(/@supports \([^)]*position-anchor[^{]*\{[\s\S]*?\n\}/)?.[0]
    const anchoredPanel = supports?.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(anchoredPanel).toContain('padding-block-end: 0')
  })

  it('transitions display and overlay discretely, from the base rule', () => {
    const base = css.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(base).toContain('display var(--duration-expand) allow-discrete')
    expect(base).toContain('overlay var(--duration-expand) allow-discrete')
  })

  it('matches the trigger and any of its descendants when the panel is open', () => {
    const variant = css.match(/@custom-variant popover-open \([^;]*\);/s)?.[0]
    expect(variant).toBeTruthy()
    expect(variant).toContain(
      '.sankara-popover-trigger:has(+ [popover]:popover-open)'
    )
    expect(variant).toContain(
      '.sankara-popover-trigger:has(+ [popover]:popover-open) *'
    )
  })
})
