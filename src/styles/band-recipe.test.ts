// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOKENS } from './tokens.js'

// The README's band recipe is the whole of section theming (spec D6), and it
// only works if it re-declares every colour a package rule reads: aliases
// resolve at :root, so anything left out keeps the page's colour inside the
// band. This cross-checks the documented recipe against the stylesheet.
const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const readme = fs.readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

// Deliberately not re-themed -- see the spec's D6.
const EXCLUDED = ['--color-destructive', '--color-backdrop']

// Tokens that are not colours, so a band has nothing to re-declare. Keyed off
// TOKENS rather than a name prefix: a new token a rule reads fails the test
// below until it is either in the recipe or listed here.
const NOT_COLOUR = [
  '--radius-card',
  '--duration-expand',
  '--richtext-flow',
  '--richtext-measure',
  '--richtext-h1',
  '--richtext-h2',
  '--richtext-h3',
  '--richtext-h4',
  '--heading-1',
  '--heading-2',
  '--heading-3',
  '--heading-4',
]

const TOKEN_READ = /var\((--[\w-]+)/g

describe('section theming recipe', () => {
  const recipe = readme.match(/@utility band-accent \{[\s\S]*?\n\}/)?.[0] ?? ''

  it('is documented in the README', () => {
    expect(recipe).not.toBe('')
  })

  it('re-declares every colour token a package rule reads', () => {
    // Rules only: the @theme block is the defaults, not a read.
    const rules = css
      .slice(css.indexOf('}', css.indexOf('@theme')) + 1)
      .replace(/\/\*[\s\S]*?\*\//g, '')
    const tokens = new Set<string>(TOKENS)
    const reads = new Set(
      [...rules.matchAll(TOKEN_READ)].map(m => m[1]!).filter(token => tokens.has(token))
    )
    const declared = new Set([...recipe.matchAll(/^\s*(--[\w-]+):/gm)].map(m => m[1]!))
    const missing = [...reads].filter(
      token => !declared.has(token) && !EXCLUDED.includes(token) && !NOT_COLOUR.includes(token)
    )
    expect(missing).toEqual([])
  })
})
