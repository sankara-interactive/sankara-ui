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
    const open: Array<{ layer: string | null; depth: number }> = []
    let depth = 0
    // Text since the last brace or semicolon — a long comma-separated
    // selector list can put its `{` on its own line, so detection can't
    // assume the selector's first character and its `{` share a line.
    let buffer = ''

    // Comments could themselves contain braces or selector-looking text, so
    // strip them before scanning rather than trying to detect them inline.
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')

    for (const ch of stripped) {
      if (ch === '{') {
        const text = buffer.replace(/\s+/g, ' ').trim()
        const layer = text.match(/^@layer\s+([\w-]+)$/)?.[1]
        // Anything that is not an at-rule is a selector prelude. Matching a
        // set of expected first characters instead (`/^[.[:]/`) would make a
        // prelude beginning with a letter invisible — and a bare `h2 { }`
        // escaping into this file is exactly the rule that must not ship
        // unlayered.
        if (layer) {
          open.push({ layer, depth })
        } else if (text.length > 0 && !text.startsWith('@')) {
          found.push({ selector: text, layer: open.at(-1)?.layer ?? null })
        }
        depth += 1
        buffer = ''
      } else if (ch === '}') {
        depth -= 1
        while (open.length > 0 && depth <= open.at(-1)!.depth) open.pop()
        buffer = ''
      } else if (ch === ';') {
        // Ends a declaration or a brace-less at-rule (e.g. @custom-variant
        // ...;) — either way, nothing before it belongs to the next prelude.
        buffer = ''
      } else {
        buffer += ch
      }
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
