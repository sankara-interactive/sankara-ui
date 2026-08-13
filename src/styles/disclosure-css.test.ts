// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const block = css.slice(css.indexOf('/* Disclosure'), css.indexOf('/* END disclosure'))

const ruleFor = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return block.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 's'))?.[0] ?? ''
}

describe('disclosure stylesheet', () => {
  it('ships its rules inside @layer components, so consumer utilities still win', () => {
    expect(block).toMatch(/@layer components\s*\{/)
    const outside = block
      .replace(/@layer components\s*\{[\s\S]*\}/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    expect(outside).toBe('')
  })

  it('lays out the summary and hides the native markers', () => {
    const summary = ruleFor('.sankara-disclosure-summary')
    expect(summary).toContain('justify-content: space-between')
    expect(summary).toContain('list-style: none')
    expect(ruleFor('.sankara-disclosure-summary::-webkit-details-marker')).toContain(
      'display: none'
    )
  })

  it('draws the chevron and turns it on open', () => {
    const indicator = ruleFor('.sankara-disclosure-indicator')
    expect(indicator).toContain('border-right: 2px solid currentColor')
    expect(indicator).toContain('rotate: 45deg')
    expect(indicator).toContain('transition: rotate var(--duration-expand)')
    expect(
      ruleFor('.sankara-disclosure[open] > .sankara-disclosure-summary > .sankara-disclosure-indicator')
    ).toContain('rotate: 225deg')
  })

  it('stills the chevron under prefers-reduced-motion', () => {
    const reduced = block.slice(block.indexOf('@media (prefers-reduced-motion'))
    expect(reduced).toContain('.sankara-disclosure-indicator')
    expect(reduced).toContain('transition: none')
  })
})
