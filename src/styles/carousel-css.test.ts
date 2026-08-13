// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const block = css.slice(css.indexOf('/* Carousel'), css.indexOf('/* END carousel'))

const ruleFor = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return block.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 's'))?.[0] ?? ''
}

describe('carousel stylesheet', () => {
  it('ships its rules inside @layer components, so consumer utilities still win', () => {
    expect(block).toMatch(/@layer components\s*\{/)
    // Nothing in the block may sit outside the layer: strip the layer body and
    // assert no selector remains at the top level.
    const outside = block
      .replace(/@layer components\s*\{[\s\S]*\}/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    expect(outside).toBe('')
  })

  it('derives slide width from the public variables, with the prop-carrying private ones as fallback', () => {
    const rule = ruleFor('.sankara-carousel-slide')
    expect(rule).toContain('flex-basis')
    expect(rule).toContain('var(--carousel-per-view, var(--_carousel-per-view, 1))')
    expect(rule).toContain('var(--carousel-gap, var(--_carousel-gap, 16px))')
  })

  it('sizes the track gap the same way', () => {
    expect(ruleFor('.sankara-carousel-track')).toContain(
      'var(--carousel-gap, var(--_carousel-gap, 16px))'
    )
  })

  // These were Tailwind utilities in the JSX until D9: in @layer utilities they
  // sat in the consumer's own layer, where a consumer's gap-2 lost to the
  // package's gap-6 by canonical sort order alone.
  it('owns the layout the component no longer spells inline', () => {
    expect(ruleFor('.sankara-carousel')).toContain('flex-direction: column')
    const track = ruleFor('.sankara-carousel-track')
    expect(track).toContain('overflow-x: auto')
    expect(track).toContain('scroll-snap-type: x mandatory')
    expect(ruleFor('.sankara-carousel-slide')).toContain('scroll-snap-align: start')
    expect(ruleFor('.sankara-carousel-dots')).toContain('justify-content: center')
  })

  it('drives the active dot width from aria-current rather than a JSX ternary', () => {
    expect(ruleFor('.sankara-carousel-dot')).toContain('inline-size: 0.625rem')
    expect(ruleFor(".sankara-carousel-dot[aria-current='true']")).toContain('inline-size: 2rem')
  })

  it('colours dots from the two carousel tokens', () => {
    expect(ruleFor('.sankara-carousel-dot')).toContain('var(--carousel-dot)')
    expect(ruleFor(".sankara-carousel-dot[aria-current='true']")).toContain(
      'var(--carousel-dot-active)'
    )
  })

  it('declares theme defaults for both dot tokens', () => {
    const theme = css.slice(0, css.indexOf('}'))
    expect(theme).toContain('--carousel-dot:')
    expect(theme).toContain('--carousel-dot-active:')
  })
})
