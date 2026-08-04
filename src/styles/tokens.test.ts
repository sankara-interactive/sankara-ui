// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOKENS } from './tokens.js'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

describe('token contract', () => {
  it('declares a default for every documented token', () => {
    const missing = TOKENS.filter(token => !css.includes(`${token}:`))
    expect(missing).toEqual([])
  })

  it('declares the defaults inside an @theme block', () => {
    expect(css).toMatch(/@theme\s*\{/)
  })
})

describe('cascade layering', () => {
  // Layers resolve BEFORE specificity, so the layer a rule ships in decides
  // whether a consumer can override it at all. Component rules live in
  // components, where they beat a project's base rules and lose to utilities.
  // The rich text defaults deliberately live in base, :where()-wrapped, so a
  // project's own element rules win on specificity — see the RichText spec's D3.
  // An unlayered rule would beat everything, which is why nothing may sit outside.
  const layerOf = (css: string) => {
    const found: Array<{ selector: string; layer: string | null }> = []
    let depth = 0
    const open: Array<{ layer: string | null; depth: number }> = []

    for (const line of css.split('\n')) {
      const layer = line.match(/^\s*@layer\s+([\w-]+)\s*\{/)?.[1]
      // A selector line starts a rule: a class, an attribute, or a :where().
      if (/^\s*[.[:]/.test(line) && line.includes('{')) {
        found.push({ selector: line.trim(), layer: open.at(-1)?.layer ?? null })
      }
      if (layer) open.push({ layer, depth })
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
      while (open.length > 0 && depth <= open.at(-1)!.depth) open.pop()
    }
    return found
  }

  const rules = layerOf(css)

  it('ships no rule outside a layer', () => {
    expect(rules.filter(rule => rule.layer === null).map(rule => rule.selector)).toEqual([])
  })

  it('ships the rich text defaults in base so a project can override them', () => {
    const misplaced = rules
      .filter(rule => rule.selector.includes('sankara-richtext') && rule.layer !== 'base')
      .map(rule => rule.selector)
    expect(misplaced).toEqual([])
  })

  it('ships every other component rule in components', () => {
    const misplaced = rules
      .filter(
        rule =>
          /sankara-(button|dialog|disclosure|popover)/.test(rule.selector) &&
          rule.layer !== 'components'
      )
      .map(rule => rule.selector)
    expect(misplaced).toEqual([])
  })
})
