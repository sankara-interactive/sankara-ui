// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

// The whole heading block, from its opening comment to the END marker.
const block = css.slice(css.indexOf('/* Page headings'), css.indexOf('/* END headings'))

const ruleFor = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return block.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 's'))?.[0] ?? ''
}

// Every selector prelude in the block — collected by scanning, not by matching
// a line prefix. A prefix filter (`/^\s*\./`) cannot see a prelude that starts
// with a letter, which is precisely the dangerous shape: a bare `h1 {}` or an
// `h1, .h1 {}` twin escaping into this block would restyle every heading on
// every consumer's site, and would be invisible to a prefix filter.
const selectorPreludes = (() => {
  const stripped = block.replace(/\/\*[\s\S]*?\*\//g, '')
  const found: string[] = []
  let buffer = ''
  for (const ch of stripped) {
    if (ch === '{') {
      const text = buffer.replace(/\s+/g, ' ').trim()
      // At-rules (@layer, @media, @supports) are structure, not selectors.
      if (text && !text.startsWith('@')) found.push(text)
      buffer = ''
    } else if (ch === '}' || ch === ';') {
      buffer = ''
    } else {
      buffer += ch
    }
  }
  return found
})()

describe('heading stylesheet', () => {
  it('ships the block, delimited by its markers', () => {
    expect(css).toContain('/* Page headings')
    expect(css).toContain('/* END headings')
    expect(block.length).toBeGreaterThan(0)
  })

  it.each([
    ['.h1', '--heading-1', '1.1'],
    ['.h2', '--heading-2', '1.15'],
    ['.h3', '--heading-3', '1.2'],
    ['.h4', '--heading-4', '1.3'],
  ])('%s sets %s and its line-height', (selector, token, lineHeight) => {
    const rule = ruleFor(selector)
    expect(rule).toContain(`font-size: var(${token})`)
    expect(rule).toContain(`line-height: ${lineHeight}`)
  })

  // D6: only fairmed sizes h5/h6, and a 16px unweighted .h6 is body copy.
  it('defines no .h5 or .h6 rule', () => {
    expect(ruleFor('.h5')).toBe('')
    expect(ruleFor('.h6')).toBe('')
  })

  // D4: the whole point. Styling the tag restyles a consumer's own headings.
  it('targets classes only, never a bare heading tag', () => {
    const notClassOnly = selectorPreludes.filter(
      prelude => !/^\.h[1-4]$/.test(prelude)
    )
    expect(notClassOnly).toEqual([])
  })

  // D5: the columns the five surveyed projects disagree on stay out.
  it.each(['font-weight', 'font-family', 'color', 'margin'])(
    'ships no %s declaration',
    property => {
      const stripped = block.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(stripped).not.toMatch(new RegExp(`(^|[;{\\s])${property}\\s*:`))
    }
  )

  it('ships inside @layer base', () => {
    expect(block).toMatch(/@layer\s+base\s*\{/)
  })
})
