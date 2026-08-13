// @vitest-environment node
import postcss, { type AtRule, type Container, type Document } from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { describe, expect, it } from 'vitest'

// The one test that checks the claim rather than the text: the other stylesheet
// tests grep tokens.css, which cannot tell whether a rule ends up somewhere a
// consumer utility can override. Compiles the package the way a consumer does
// and asks the resulting AST which layer each selector landed in.
//
// Layer order has to carry this on its own: Tailwind emits the utilities block
// physically BEFORE the components block, so source order says the opposite.
const entry = new URL('./tokens.css', import.meta.url).pathname

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
