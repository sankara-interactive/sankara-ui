// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

// The whole rich text block, from its opening comment to the closing brace of
// the @layer base wrapper it lives in.
const block = css.slice(css.indexOf('/* Rich text'), css.indexOf('/* END rich text'))

const ruleFor = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return block.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 's'))?.[0] ?? ''
}

describe('rich text stylesheet', () => {
  it('wraps every selector token in :where() so a project rule outranks it', () => {
    const selectorLines = block
      .split('\n')
      .filter(line => /^\s*[.:[]/.test(line) && line.includes('{'))
      .map(line => line.trim().replace(/\s*\{$/, ''))

    // Split a selector into its top-level compound selectors, i.e. break on
    // combinators (descendant space, >, +, ~) and list-separating commas —
    // but only outside parens, since :where(li > ul, li > ol) has commas and
    // combinators that are arguments, not structure, of the outer selector.
    const splitTopLevel = (selector: string): string[] => {
      const segments: string[] = []
      let depth = 0
      let current = ''
      for (const ch of selector) {
        if (ch === '(') depth += 1
        if (ch === ')') depth -= 1
        if (depth === 0 && (ch === ' ' || ch === '>' || ch === '+' || ch === '~' || ch === ',')) {
          if (current.trim()) segments.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      if (current.trim()) segments.push(current.trim())
      return segments
    }

    // A compound selector is safe if it's the universal selector (already
    // zero specificity, nothing to gain by wrapping it) or if a single
    // :where(...) call wraps the entire thing — not just its opening token.
    const isWrapped = (segment: string): boolean => {
      if (segment === '*') return true
      if (!segment.startsWith(':where(')) return false
      let depth = 0
      for (let i = 0; i < segment.length; i++) {
        if (segment[i] === '(') depth += 1
        if (segment[i] === ')') {
          depth -= 1
          if (depth === 0) return i === segment.length - 1
        }
      }
      return false
    }

    const unwrapped = selectorLines.flatMap(line =>
      splitTopLevel(line).filter(segment => !isWrapped(segment))
    )
    // Naming the offending token(s), not just failing a boolean: a bare tag,
    // class or attribute selector here raises the rule's specificity, which
    // is the one thing @layer base + :where() exists to prevent.
    expect(unwrapped).toEqual([])
  })

  it('spaces blocks with a logical margin on the owl selector', () => {
    const flow = ruleFor(':where(.sankara-richtext) > * + *')
    expect(flow).toContain('margin-block-start: var(--richtext-flow)')
    expect(flow).not.toContain('margin-top')
  })

  it.each([
    ['h1', '--richtext-h1'],
    ['h2', '--richtext-h2'],
    ['h3', '--richtext-h3'],
    ['h4', '--richtext-h4'],
  ])('sizes %s from %s and restores its weight', (tag, token) => {
    const rule = ruleFor(`:where(.sankara-richtext) :where(${tag})`)
    expect(rule).toContain(`font-size: var(${token})`)
    // Preflight sets font-weight: inherit on headings; size alone is not a hierarchy.
    expect(rule).toContain('font-weight: 600')
    expect(rule).toMatch(/line-height: 1\.\d+/)
  })

  it('gives h5 and h6 weight without a size', () => {
    const rule = ruleFor(':where(.sankara-richtext) :where(h5, h6)')
    expect(rule).toContain('font-weight: 600')
    expect(rule).not.toContain('font-size')
  })

  it('restores list markers, indents and nesting', () => {
    expect(ruleFor(':where(.sankara-richtext) :where(ul)')).toContain('list-style-type: disc')
    expect(ruleFor(':where(.sankara-richtext) :where(ol)')).toContain('list-style-type: decimal')
    expect(ruleFor(':where(.sankara-richtext) :where(ul ul)')).toContain('list-style-type: circle')
    expect(ruleFor(':where(.sankara-richtext) :where(ol ol)')).toContain('list-style-type: lower-alpha')
    expect(ruleFor(':where(.sankara-richtext) :where(ul)')).toContain('padding-inline-start')
  })

  it('spaces list items and nested lists, which the owl selector cannot reach', () => {
    expect(ruleFor(':where(.sankara-richtext) :where(li + li)')).toContain('margin-block-start')
    expect(ruleFor(':where(.sankara-richtext) :where(li > ul, li > ol)')).toContain(
      'margin-block-start'
    )
  })

  it('underlines links rather than relying on colour alone', () => {
    const rule = ruleFor(':where(.sankara-richtext) :where(a)')
    expect(rule).toContain('color: var(--color-primary)')
    expect(rule).toContain('text-decoration-line: underline')
    expect(rule).toContain('text-underline-offset')
  })

  it('restores table borders, padding and header alignment', () => {
    expect(ruleFor(':where(.sankara-richtext) :where(table)')).toContain('border-collapse: collapse')
    const cells = ruleFor(':where(.sankara-richtext) :where(th, td)')
    expect(cells).toContain('border: 1px solid var(--color-muted)')
    expect(cells).toContain('padding:')
    const th = ruleFor(':where(.sankara-richtext) :where(th)')
    expect(th).toContain('text-align: start')
  })

  it('restores hr and gives blockquote a fallback', () => {
    expect(ruleFor(':where(.sankara-richtext) :where(hr)')).toContain('border-block-start')
    expect(ruleFor(':where(.sankara-richtext) :where(blockquote)')).toContain(
      'border-inline-start'
    )
  })

  it('hyphenates headings only, always with the character limit', () => {
    const hyphenated = block.match(/hyphens:\s*auto/g) ?? []
    const limited = block.match(/hyphenate-limit-chars:\s*14 5 5/g) ?? []
    expect(hyphenated.length).toBeGreaterThan(0)
    // Plain `hyphens: auto` chops short German words; the limit is not optional.
    expect(limited.length).toBe(hyphenated.length)
    // Body copy is deliberately not hyphenated — that policy needs its own evidence.
    expect(ruleFor(':where(.sankara-richtext) :where(p)')).not.toContain('hyphens')
  })

  it('constrains text children, not the container, and exempts wide content', () => {
    const measured = ruleFor(':where(.sankara-richtext-measure) > *')
    expect(measured).toContain('max-inline-size: var(--richtext-measure)')
    const exempt = ruleFor(
      ':where(.sankara-richtext-measure) > :where(table, figure, img, video, iframe, [data-wide])'
    )
    expect(exempt).toContain('max-inline-size: none')
    // On the base class the measure would be unremovable, so every occurrence
    // must live in a -measure rule. Asserted positively: a bare `not.toContain`
    // on a selector that does not exist would pass no matter what shipped.
    const measureRules = block.split('\n').filter(line => line.includes('max-inline-size'))
    expect(measureRules.length).toBe(2)
    const owners = block
      .split('}')
      .filter(chunk => chunk.includes('max-inline-size'))
      .map(chunk => chunk.trim().split('{')[0]?.trim())
    expect(owners.every(selector => selector?.includes('sankara-richtext-measure'))).toBe(true)
  })

  it.each([
    '--richtext-flow',
    '--richtext-measure',
    '--richtext-h1',
    '--richtext-h2',
    '--richtext-h3',
    '--richtext-h4',
  ])('declares %s with a default', token => {
    expect(css).toMatch(new RegExp(`${token}:\\s*[^;]+;`))
  })
})
