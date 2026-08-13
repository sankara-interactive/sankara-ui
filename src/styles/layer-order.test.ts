// @vitest-environment node
import postcss, { type AtRule, type Container, type Document } from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { describe, expect, it } from 'vitest'

// The one test that checks the claim rather than the text: every other
// stylesheet test greps tokens.css, which cannot tell whether a rule actually
// ends up somewhere a consumer utility can override. This compiles the package
// the way a consumer does -- Tailwind first, then styles.css -- and asks the
// resulting AST which layer each selector landed in.
//
// Consumer utilities must outrank package defaults by LAYER, never by source
// order or specificity: Tailwind emits the utilities block physically before
// the components block, so source order would give the opposite answer.
const entry = new URL('./tokens.css', import.meta.url).pathname

// The classes a consumer would reach for to override what the package sets.
const CONSUMER = ['gap-2', 'gap-8', 'flex', 'shrink', 'items-start', 'justify-start']

const compile = async () =>
  postcss([tailwind({ optimize: false })]).process(
    `@import "tailwindcss" source(none);\n@import "${entry}";\n@source inline("${CONSUMER.join(' ')}");\n`,
    { from: entry }
  )

const result = await compile()

// Outermost enclosing @layer wins -- a nested @layer inside one is a sublayer of
// it, and the outer name is what orders the rule against the consumer's.
function layerOf(selector: string): string | null {
  let layer: string | null = null
  result.root.walkRules(rule => {
    if (layer !== null || rule.selector !== selector) return
    for (let node: Container | Document | undefined = rule.parent; node; node = node.parent) {
      if (node.type === 'atrule') {
        const at = node as AtRule
        if (at.name === 'layer' && at.params) layer = at.params
      }
    }
    layer ??= '(unlayered)'
  })
  return layer
}

describe('cascade layers in a compiled consumer build', () => {
  it('orders components before utilities', () => {
    const statement = result.css.match(/@layer ([^;{]*components[^;{]*);/)?.[1] ?? ''
    const order = statement.split(',').map(name => name.trim())
    expect(order).toContain('components')
    expect(order.indexOf('components')).toBeLessThan(order.indexOf('utilities'))
  })

  // Each of these carried Tailwind utilities in JSX before D9's follow-up,
  // which put them in @layer utilities -- the consumer's own layer, where the
  // winner came down to Tailwind's canonical sort.
  it.each([
    '.sankara-carousel',
    '.sankara-carousel-track',
    '.sankara-carousel-slide',
    '.sankara-carousel-dots',
    '.sankara-carousel-dot',
    '.sankara-disclosure-summary',
    '.sankara-disclosure-indicator',
    '.sankara-fa-icon',
    '.sankara-dialog',
    '.sankara-dialog-sm',
    '.sankara-dialog-end',
    '.sankara-dialog-end.sankara-dialog-sm',
  ])('puts %s in @layer components, below any consumer utility', selector => {
    expect(layerOf(selector)).toBe('components')
  })

  it.each(CONSUMER)('leaves the consumer utility .%s in @layer utilities', utility => {
    expect(layerOf(`.${utility}`)).toBe('utilities')
  })
})
