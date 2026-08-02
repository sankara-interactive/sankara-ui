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

  it('transitions display and overlay discretely, from the base rule', () => {
    const base = css.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(base).toContain('display var(--duration-expand) allow-discrete')
    expect(base).toContain('overlay var(--duration-expand) allow-discrete')
  })

  it('ships the popover-open variant', () => {
    expect(css).toContain('@custom-variant popover-open')
  })
})
