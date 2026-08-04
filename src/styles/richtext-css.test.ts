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

// Every selector prelude in the block — collected by scanning, not by matching
// a line prefix. A prefix filter (`/^\s*[.:[]/`) cannot see a prelude that
// starts with a letter, which is precisely the dangerous shape: a bare `h2 {}`
// escaping the container would restyle every heading on the consumer's site,
// and would have been invisible to this file.
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

describe('rich text stylesheet', () => {
  it('scopes every rule to the container and leaves element tokens bare, tying preflight and a project rule in turn', () => {
    // Split a selector into its top-level compound selectors, i.e. break on
    // combinators (descendant space, >, +, ~) and list-separating commas —
    // but only outside parens, since :is(li > ul, li > ol) has commas and
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

    // True only if a single :where(...) call wraps the entire segment — not
    // just its opening token.
    const isWrappedInWhere = (segment: string): boolean => {
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

    // The first compound selector of every rule must be the
    // :where()-wrapped container: :where() so the class itself adds zero
    // specificity, and the container so no rule here can ever reach an element
    // outside a rich text block. Every element token after it (h2,
    // :is(h5, h6), ...) must stay bare — re-wrapping it in :where() would drop
    // the rule back to (0,0,0), which loses outright to preflight's own
    // (0,0,1) base-layer resets. Named per violation, not just a boolean.
    expect(selectorPreludes.length).toBeGreaterThan(0)
    const violations = selectorPreludes.flatMap(prelude => {
      const [container, ...elementTokens] = splitTopLevel(prelude)
      const found: string[] = []
      if (container === undefined || !isWrappedInWhere(container)) {
        found.push(`first compound selector not a :where() container: ${prelude}`)
      } else if (!container.startsWith(':where(.sankara-richtext')) {
        found.push(`rule not scoped to the rich text container: ${prelude}`)
      }
      for (const token of elementTokens) {
        if (isWrappedInWhere(token)) {
          found.push(`element token re-wrapped in :where(): ${token}`)
        }
      }
      return found
    })
    expect(violations).toEqual([])
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
    const rule = ruleFor(`:where(.sankara-richtext) ${tag}`)
    expect(rule).toContain(`font-size: var(${token})`)
    // Preflight sets font-weight: inherit on headings; size alone is not a hierarchy.
    expect(rule).toContain('font-weight: 600')
    expect(rule).toMatch(/line-height: 1\.\d+/)
  })

  it('gives h5 and h6 weight without a size', () => {
    const rule = ruleFor(':where(.sankara-richtext) :is(h5, h6)')
    expect(rule).toContain('font-weight: 600')
    expect(rule).not.toContain('font-size')
  })

  it('restores list markers, indents and nesting', () => {
    expect(ruleFor(':where(.sankara-richtext) ul')).toContain('list-style-type: disc')
    expect(ruleFor(':where(.sankara-richtext) ol')).toContain('list-style-type: decimal')
    expect(ruleFor(':where(.sankara-richtext) ul ul')).toContain('list-style-type: circle')
    expect(ruleFor(':where(.sankara-richtext) ol ol')).toContain('list-style-type: lower-alpha')
    expect(ruleFor(':where(.sankara-richtext) ul')).toContain('padding-inline-start')
  })

  it('spaces list items and nested lists, which the owl selector cannot reach', () => {
    expect(ruleFor(':where(.sankara-richtext) li + li')).toContain('margin-block-start')
    expect(ruleFor(':where(.sankara-richtext) :is(li > ul, li > ol)')).toContain(
      'margin-block-start'
    )
  })

  it('underlines links rather than relying on colour alone', () => {
    const rule = ruleFor(':where(.sankara-richtext) a')
    expect(rule).toContain('color: var(--color-primary)')
    expect(rule).toContain('text-decoration-line: underline')
    expect(rule).toContain('text-underline-offset')
  })

  it('restores table borders, padding and header alignment', () => {
    const table = ruleFor(':where(.sankara-richtext) table')
    expect(table).toContain('border-collapse: collapse')
    expect(table).toContain('inline-size: 100%')
    // Nothing strips a table's alignment, so setting one restores nothing and
    // overrides *inherited* alignment instead: a table inside a consumer's
    // `text-center` block would compute `start` while its siblings centre.
    expect(table).not.toContain('text-align')
    const cells = ruleFor(':where(.sankara-richtext) :is(th, td)')
    expect(cells).toContain('border: 1px solid var(--color-muted)')
    expect(cells).toContain('padding:')
    // th is the exception: the UA stylesheet really does set `center` on it.
    const th = ruleFor(':where(.sankara-richtext) th')
    expect(th).toContain('text-align: start')
  })

  it('keeps an image inside a text node inline, which preflight turns into a block', () => {
    const rule = ruleFor(':where(.sankara-richtext) :is(p, li, td, th) img')
    expect(rule).toContain('display: inline-block')
  })

  it('restores hr and gives blockquote a fallback', () => {
    expect(ruleFor(':where(.sankara-richtext) hr')).toContain('border-block-start')
    expect(ruleFor(':where(.sankara-richtext) blockquote')).toContain(
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
    expect(ruleFor(':where(.sankara-richtext) p')).not.toContain('hyphens')
  })

  it('constrains text children, not the container, and exempts wide content', () => {
    const measured = ruleFor(':where(.sankara-richtext-measure) > *')
    expect(measured).toContain('max-inline-size: var(--richtext-measure)')
    const exempt = ruleFor(
      ':where(.sankara-richtext-measure) > :is(table, figure, img, video, iframe, [data-wide])'
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

  it('resolves the measure once, so it is not re-resolved against each child font', () => {
    // `ch` is font-relative. An *unregistered* custom property is substituted
    // as tokens and re-resolved wherever it is read, so `68ch` becomes a
    // different length on every child — headings, wider than body copy, get a
    // wider measure than the paragraphs beside them. Registering it as a
    // <length> computes it where it is declared and inherits an absolute
    // length. Measured in Chrome 150 before this registration, one container:
    // p and ul 685.31px, h5 724.98px, h4 859.71px, h3 979.76px, h2 1179.75px,
    // h1 1429.42px. After: all seven 685.31px.
    const registration = css.match(/@property --richtext-measure\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(registration).toContain("syntax: '<length>'")
    expect(registration).toContain('inherits: true')
    // Only reached if @theme's declaration is missing or a consumer supplies a
    // non-<length>; 0px there would collapse every child to nothing, which D4
    // forbids the contract from degrading to.
    expect(registration).toMatch(/initial-value: (?!0)/)

    // The token must be declared exactly once outside the registration, in
    // @theme. A second declaration on the container would resolve `ch` against
    // the container font — but it ships in @layer base, which outranks the
    // @layer theme block a consumer's own @theme override lands in, so it
    // would silently pin the measure at 68ch. Measured: with the container
    // declaration in place, a consumer @theme of 40ch computed 403.13px at the
    // root and 685.31px inside the container.
    const declarations = css.match(/--richtext-measure:\s*[^;]+;/g) ?? []
    expect(declarations).toEqual(['--richtext-measure: 68ch;'])
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
