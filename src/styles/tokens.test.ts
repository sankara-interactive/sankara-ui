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
  // An unlayered rule beats every layered rule regardless of specificity, and
  // Tailwind puts consumer utilities in @layer utilities — so a component rule
  // shipped unlayered silently overrides the classes consumers write on it.
  // Everything except @theme and @custom-variant must therefore stay layered.
  it('ships every component rule inside @layer components', () => {
    const unlayered: string[] = []
    let depth = 0
    let layerDepth: number | null = null

    for (const line of css.split('\n')) {
      const isSelector = /^\s*[.[]/.test(line) && line.includes('{')
      if (isSelector && layerDepth === null) unlayered.push(line.trim())
      if (/^\s*@layer\s+[\w-]+\s*\{/.test(line)) layerDepth = depth
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
      if (layerDepth !== null && depth <= layerDepth) layerDepth = null
    }

    expect(unlayered).toEqual([])
  })
})
