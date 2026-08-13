// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const block = css.slice(css.indexOf('/* Webfont icon box'), css.indexOf('/* END fa-icon'))

describe('fa-icon stylesheet', () => {
  it('ships its rule inside @layer components, so consumer utilities still win', () => {
    expect(block).toMatch(/@layer components\s*\{/)
    const outside = block
      .replace(/@layer components\s*\{[\s\S]*\}/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    expect(outside).toBe('')
  })

  // inline-flex and shrink-0 were the two utilities most certain to defeat a
  // consumer override: both sort after the flex and shrink they would replace.
  it('centres the glyph without the component spelling it inline', () => {
    const rule = block.match(/\.sankara-fa-icon\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(rule).toContain('display: inline-flex')
    expect(rule).toContain('flex-shrink: 0')
    expect(rule).toContain('line-height: 1')
  })
})
