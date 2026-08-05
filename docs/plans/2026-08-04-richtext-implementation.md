# `RichText` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `RichText` — the stylesheet contract that makes CMS rich text
readable after Tailwind's preflight strips it, plus the wrapper component — per
`docs/specs/2026-08-04-richtext-design.md`.

**Architecture:** A `.sankara-richtext` class carrying the whole contract, shipped
in `@layer base` with every selector `:where()`-wrapped so a project's own rules
win on specificity and Tailwind utilities win by layer. A thin server component
wraps children in a `<div>` and owns one decision — whether the measure applies.
Six new tokens carry every tunable value.

**Tech Stack:** React 19, TypeScript (`module: nodenext`), Tailwind v4, Vitest +
jsdom + Testing Library, Storybook 10, Changesets.

## Global Constraints

- Relative imports carry the `.js` extension (`../utilities/cn.js`) — `nodenext`
  plus `verbatimModuleSyntax`.
- `RichText` is a **server component**. No `'use client'`; the build's
  `check-directives.mjs` must still report the directive in exactly 3 files.
- Token contract stays in sync across three places: `TOKENS` in
  `src/styles/tokens.ts`, the `@theme` block in `src/styles/tokens.css`, and the
  README table. `tokens.test.ts` fails otherwise.
- **The rich text block ships in `@layer base`, `:where()`-wrapped** — unlike every
  other component in this package, which ships in `@layer components`. This is
  spec D3 and it is load-bearing; Task 1 makes it enforceable.
- No new dependency. No `@tailwindcss/typography`.
- Public surface is `src/index.ts`.
- `yarn check` (typecheck + test + build) must pass before any PR.
- Every user-facing change needs a changeset committed alongside it.
- Work on branch `feat/richtext`. Never commit to `main`. Ask before pushing.

## Findings already established (do not re-derive)

- **Cascade layers resolve before specificity.** Measured on a compiled Tailwind
  4.3.3 fixture in Chrome: with our rules in `@layer components`, a project's own
  `@layer base { h2 }` LOST (our 32px beat their 48px). With our rules in
  `@layer base` and `:where()`-wrapped, the project won (48px) and a `text-xs`
  utility still beat both (12px). That measurement is why D3 exists.
- **brillen-werk keeps its heading rules in `@layer base`** (`styles/globals.css:26`),
  so this is a real consumer, not a hypothetical.
- **Preflight is what breaks rich text:** `margin: 0` everywhere, `font-size` and
  `font-weight: inherit` on `h1`–`h6`, `list-style: none` on lists, `color` and
  `text-decoration: inherit` on links. Everything the contract restores traces to
  one of those.
- **jsdom applies no UA stylesheet worth trusting and computes no layout.** Every
  visual claim belongs in Task 5, not in a unit test.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/styles/tokens.test.ts` (modify) | Layering invariant, strengthened to check *which* layer and to see `:where()` selectors |
| `src/styles/tokens.ts` (modify) | Six new tokens in `TOKENS` |
| `src/styles/tokens.css` (modify) | Token defaults, and the rich text block in `@layer base` |
| `src/styles/richtext-css.test.ts` (create) | Pins the CSS contract table |
| `src/components/RichText.tsx` (create) | The wrapper component |
| `src/components/RichText.test.tsx` (create) | Class, measure, children, prop routing |
| `src/components/RichText.stories.tsx` (create) | A realistic German CMS document |
| `src/index.ts` (modify) | Export `RichText`, `RichTextProps` |
| `README.md` (modify) | Consumer docs, six token rows |
| `.changeset/*.md` (create) | Minor bump |

---

### Task 1: Make the layer placement enforceable

Spec D3 puts the rich text rules in `@layer base` while every other component
stays in `@layer components`. The existing invariant in `tokens.test.ts` cannot
tell those apart, and its selector regex only matches lines starting with `.` or
`[` — so an unlayered `:where(…)` rule would slip through entirely. Fix the net
before adding the thing it must catch.

**Files:**
- Modify: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: an invariant later tasks rely on — `.sankara-richtext*` rules must be
  in `base`, every other `.sankara-*` rule in `components`, and nothing unlayered.

- [ ] **Step 1: Replace the `cascade layering` describe block**

```ts
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
```

- [ ] **Step 2: Run it against the current stylesheet**

Run: `yarn vitest run src/styles/tokens.test.ts`
Expected: PASS, 5 tests. The rich text test passes vacuously — no such rules
exist yet — and the other two must pass against what is already shipped. If the
"no rule outside a layer" test now fails, a `:where()` rule was already escaping
the old regex; report that rather than loosening the test.

- [ ] **Step 3: Prove the two placement tests by mutation**

1. In `tokens.css`, move the `.sankara-button` block out of `@layer components`
   into a new `@layer base { … }` wrapper — the "every other component rule"
   test must fail, naming the selector. Restore.
2. Add `@layer components { .sankara-richtext { color: red } }` temporarily — the
   rich text test must fail. Remove it.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.test.ts
git commit -m "test: assert which layer each component's rules ship in"
```

---

### Task 2: Tokens and the stylesheet

**Files:**
- Modify: `src/styles/tokens.ts`, `src/styles/tokens.css`, `README.md` (token table only)
- Test: `src/styles/richtext-css.test.ts` (create)

**Interfaces:**
- Consumes: the layering invariant from Task 1.
- Produces: the `sankara-richtext` and `sankara-richtext-measure` classes that
  Task 3's component applies, and six tokens.

- [ ] **Step 1: Write the failing contract test**

```ts
// src/styles/richtext-css.test.ts
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
  it('wraps every selector in :where() so a project rule outranks it', () => {
    const selectors = block
      .split('\n')
      .filter(line => /^\s*[.:[]/.test(line) && line.includes('{'))
      .map(line => line.trim())
    const unwrapped = selectors.filter(line => !line.startsWith(':where('))
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/styles/richtext-css.test.ts`
Expected: FAIL on every case — `tokens.css` has no rich text block yet, so
`block` is an empty string.

- [ ] **Step 3: Add the tokens**

In `src/styles/tokens.css`, inside the existing `@theme` block, after
`--color-focus`:

```css
  --richtext-flow: 1rem;
  --richtext-measure: 68ch;
  --richtext-h1: clamp(1.75rem, 1.35rem + 2vw, 2.5rem);
  --richtext-h2: clamp(1.5rem, 1.2rem + 1.4vw, 2rem);
  --richtext-h3: clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem);
  --richtext-h4: clamp(1.125rem, 1.05rem + 0.4vw, 1.25rem);
```

In `src/styles/tokens.ts`, append the same six names to the `TOKENS` array,
keeping the file's existing ordering convention.

- [ ] **Step 4: Add the stylesheet block**

Append to `src/styles/tokens.css`. The `/* Rich text` and `/* END rich text`
markers are load-bearing — the contract test slices the block between them.

```css
/* Rich text: what preflight took away, put back. Preflight sets margin: 0 on
   everything, font-size/font-weight: inherit on h1-h6, list-style: none on
   lists, and color/text-decoration: inherit on links — so CMS output, the one
   markup a consumer never authors, arrives as a grey wall.

   In @layer base, NOT components, and every selector :where()-wrapped for zero
   specificity. Layers resolve before specificity, so a components-layer rule
   would beat a project's own @layer base h2 (brillen-werk keeps its heading
   rules there). Measured: from components ours won at 32px over their 48px;
   from base with :where() theirs wins and utilities still beat both. These are
   defaults meant to be stepped over — see the RichText spec's D3. */
@layer base {
  :where(.sankara-richtext) > * + * {
    margin-block-start: var(--richtext-flow);
  }

  /* Hyphenation on headings only, ported from fgpfister — German compounds
     ("Unternehmensnachfolge") overflow narrow columns, while plain `auto` also
     chops short words ("un-sere"), hence the 14-character floor. Does nothing
     without a lang attribute describing the content; the README says so. */
  :where(.sankara-richtext) :where(h1) {
    font-size: var(--richtext-h1);
    font-weight: 600;
    line-height: 1.15;
    hyphens: auto;
    hyphenate-limit-chars: 14 5 5;
  }

  :where(.sankara-richtext) :where(h2) {
    font-size: var(--richtext-h2);
    font-weight: 600;
    line-height: 1.2;
    hyphens: auto;
    hyphenate-limit-chars: 14 5 5;
  }

  :where(.sankara-richtext) :where(h3) {
    font-size: var(--richtext-h3);
    font-weight: 600;
    line-height: 1.25;
    hyphens: auto;
    hyphenate-limit-chars: 14 5 5;
  }

  :where(.sankara-richtext) :where(h4) {
    font-size: var(--richtext-h4);
    font-weight: 600;
    line-height: 1.3;
    hyphens: auto;
    hyphenate-limit-chars: 14 5 5;
  }

  /* No size: h5 and h6 stay body-sized, distinguished by weight alone. */
  :where(.sankara-richtext) :where(h5, h6) {
    font-weight: 600;
  }

  :where(.sankara-richtext) :where(ul) {
    list-style-type: disc;
    padding-inline-start: 1.25em;
  }

  :where(.sankara-richtext) :where(ol) {
    list-style-type: decimal;
    padding-inline-start: 1.5em;
  }

  :where(.sankara-richtext) :where(ul ul) {
    list-style-type: circle;
  }

  :where(.sankara-richtext) :where(ul ul ul) {
    list-style-type: square;
  }

  :where(.sankara-richtext) :where(ol ol) {
    list-style-type: lower-alpha;
  }

  /* The owl selector only reaches direct children of the container, so list
     rhythm and nested lists need their own rules — and a tighter gap. */
  :where(.sankara-richtext) :where(li + li) {
    margin-block-start: 0.25em;
  }

  :where(.sankara-richtext) :where(li > ul, li > ol) {
    margin-block-start: 0.25em;
  }

  /* Underline is not optional: preflight sets text-decoration: inherit, and a
     link identified by colour alone fails both discoverability and the
     colour-is-not-the-only-cue rule. Hover and focus states are the consumer's. */
  :where(.sankara-richtext) :where(a) {
    color: var(--color-primary);
    text-decoration-line: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  /* Editors can insert a table from the Storyblok toolbar today — the field type
     is live in 14 schemas — and preflight leaves it borderless. A table wider
     than its column still overflows; a scroll container changes the
     accessibility tree and needs a label, so the consumer's renderer owns that. */
  :where(.sankara-richtext) :where(table) {
    border-collapse: collapse;
    inline-size: 100%;
    text-align: start;
  }

  :where(.sankara-richtext) :where(th, td) {
    border: 1px solid var(--color-muted);
    padding: 0.5em 0.75em;
  }

  :where(.sankara-richtext) :where(th) {
    font-weight: 600;
    text-align: start;
  }

  :where(.sankara-richtext) :where(hr) {
    border: 0;
    border-block-start: 1px solid var(--color-muted);
  }

  /* A fallback, not a design: the estate's quotes are dedicated bloks with their
     own components, but the rich text toolbar can still emit one. */
  :where(.sankara-richtext) :where(blockquote) {
    border-inline-start: 2px solid var(--color-muted);
    padding-inline-start: 1em;
  }

  /* The measure constrains text children, never the container: a capped
     container would squeeze the tables and media above. [data-wide] is the
     documented escape hatch for an embedded blok that must run full width.
     Width only — a constrained block stays start-aligned, and consumers centre
     it themselves rather than overriding a margin we invented. */
  :where(.sankara-richtext-measure) > * {
    max-inline-size: var(--richtext-measure);
  }

  :where(.sankara-richtext-measure) > :where(table, figure, img, video, iframe, [data-wide]) {
    max-inline-size: none;
  }
}
/* END rich text */
```

- [ ] **Step 5: Add the six README token rows**

In the README's token table, after the `--color-focus` row:

```markdown
| `--richtext-flow` | Vertical rhythm between rich text blocks |
| `--richtext-measure` | Line length when `RichText` applies the measure |
| `--richtext-h1` | `h1` size inside rich text, fluid |
| `--richtext-h2` | `h2` size inside rich text, fluid |
| `--richtext-h3` | `h3` size inside rich text, fluid |
| `--richtext-h4` | `h4` size inside rich text, fluid |
```

- [ ] **Step 6: Run the tests**

Run: `yarn vitest run src/styles/`
Expected: PASS — the new file's cases, plus `tokens.test.ts` still green,
including Task 1's placement tests and the token-contract test now covering all
six new names.

- [ ] **Step 7: Prove the contract by mutation**

Each of these must fail the named test; restore after each.

1. Remove `:where()` from the `h2` selector — the `:where()` test fails.
2. Change the flow rule to `margin-top` — the flow test fails.
3. Delete `font-weight: 600` from `h3` — the heading test fails for h3.
4. Move `max-inline-size` from the measure modifier onto `.sankara-richtext` —
   the measure test fails.
5. Remove `hyphenate-limit-chars` from `h1` — the hyphenation count test fails.
6. Move the whole block from `@layer base` to `@layer components` — Task 1's
   placement test fails.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.ts src/styles/tokens.css src/styles/richtext-css.test.ts README.md
git commit -m "feat: add the rich text stylesheet contract and its six tokens"
```

---

### Task 3: The component

**Files:**
- Create: `src/components/RichText.tsx`
- Test: `src/components/RichText.test.tsx`

**Interfaces:**
- Consumes: `cn` from `../utilities/cn.js`; the classes from Task 2.
- Produces:
  - `export type RichTextProps`
  - `export function RichText(props: RichTextProps): JSX.Element`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/RichText.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText.js'

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe('RichText', () => {
  it('wraps children in a div carrying the contract class', () => {
    const { container } = render(
      <RichText>
        <p>Wir beraten Sie gern.</p>
      </RichText>
    )
    expect(root(container).tagName).toBe('DIV')
    expect(root(container).className).toContain('sankara-richtext')
    expect(screen.getByText('Wir beraten Sie gern.')).toBeInTheDocument()
  })

  it('applies the measure by default', () => {
    const { container } = render(<RichText><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext-measure')
  })

  it('drops the measure when asked', () => {
    const { container } = render(<RichText measure={false}><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext')
    expect(root(container).className).not.toContain('sankara-richtext-measure')
  })

  it('adds no wrapper of its own around the children', () => {
    const { container } = render(
      <RichText>
        <p>Erster</p>
        <p>Zweiter</p>
      </RichText>
    )
    // Direct children, or the owl selector's flow spacing never applies.
    expect([...root(container).children].map(child => child.tagName)).toEqual(['P', 'P'])
  })

  it('merges the caller’s className rather than replacing its own', () => {
    const { container } = render(<RichText className="mt-8"><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext')
    expect(root(container).className).toContain('mt-8')
  })

  it('passes lang through, which hyphenation depends on', () => {
    const { container } = render(<RichText lang="fr"><p>Bonjour</p></RichText>)
    expect(root(container)).toHaveAttribute('lang', 'fr')
  })

  it('passes rest props and ref to the div', () => {
    const ref = { current: null as HTMLDivElement | null }
    const { container } = render(
      <RichText ref={ref} id="intro" data-testid="rt"><p>Text</p></RichText>
    )
    expect(ref.current).toBe(root(container))
    expect(root(container)).toHaveAttribute('id', 'intro')
    expect(root(container)).toHaveAttribute('data-testid', 'rt')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/components/RichText.test.tsx`
Expected: FAIL — `Failed to resolve import "./RichText.js"`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/RichText.tsx
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

// WithRef, not WithoutRef: under React 19 `ref` is an ordinary prop on function
// components, so it rides along in the spread — as in Disclosure.
export type RichTextProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** CMS output, rendered by the consumer. Rendered as direct children so the
      stylesheet's flow spacing reaches them. */
  children: ReactNode
  /** Constrain line length to --richtext-measure. Default true. */
  measure?: boolean
}

export function RichText({ children, measure = true, className, ...props }: RichTextProps) {
  return (
    <div
      // `sankara-richtext` carries the whole contract and ships in @layer base,
      // :where()-wrapped, so your own element rules win. See styles.css.
      className={cn('sankara-richtext', measure && 'sankara-richtext-measure', className)}
      {...props}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run src/components/RichText.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck and confirm the client boundary is untouched**

Run: `yarn check`
Expected: clean, and `check-directives.mjs` still reports `'use client'` in
exactly 3 source files — `RichText` is a server component and must not add a
fourth.

- [ ] **Step 6: Prove the tests by mutation**

1. Change `measure = true` to `measure = false` — the default-measure test fails.
2. Drop `className` from the `cn(...)` call — the merge test fails.
3. Wrap `{children}` in an extra `<div>` — the no-wrapper test fails.

- [ ] **Step 7: Commit**

```bash
git add src/components/RichText.tsx src/components/RichText.test.tsx
git commit -m "feat: add RichText, the wrapper that applies the rich text contract"
```

---

### Task 4: Public surface, stories, docs, changeset

**Files:**
- Modify: `src/index.ts`, `README.md`
- Create: `src/components/RichText.stories.tsx`, `.changeset/richtext.md`

**Interfaces:**
- Consumes: `RichText`, `RichTextProps` from Task 3.
- Produces: the package's public `RichText` export.

- [ ] **Step 1: Export the component**

In `src/index.ts`, after the `Popover` line:

```ts
export { RichText, type RichTextProps } from './components/RichText.js'
```

- [ ] **Step 2: Write the stories**

The story doubles as the browser pass's fixture in Task 5, so it must contain
every covered node *and* a long German compound.

```tsx
// src/components/RichText.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { RichText } from './RichText.js'

const meta: Meta<typeof RichText> = { component: RichText, title: 'RichText' }
export default meta

// Shaped like real CMS output: headings, lists, a link, a table, a rule — and
// "Unternehmensnachfolge", the compound the hyphenation policy exists for.
const document = (
  <>
    <h2>Unternehmensnachfolge richtig plannen</h2>
    <p>
      Wir begleiten Sie bei der Übergabe Ihres Lebenswerks — von der ersten
      Standortbestimmung bis zum Vertragsabschluss.
    </p>
    <h3>Unsere Leistungen</h3>
    <ul>
      <li>Unternehmensbewertung</li>
      <li>
        Nachfolgeplanung
        <ul>
          <li>Familieninterne Lösungen</li>
          <li>Verkauf an Dritte</li>
        </ul>
      </li>
      <li>Steuerliche Begleitung</li>
    </ul>
    <h4>Ablauf</h4>
    <ol>
      <li>Erstgespräch</li>
      <li>Analyse</li>
    </ol>
    <p>
      Mehr dazu in unserem <a href="#leitfaden">Leitfaden zur Nachfolge</a>.
    </p>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Dauer</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Analyse</td>
          <td>4 Wochen</td>
        </tr>
        <tr>
          <td>Umsetzung</td>
          <td>3 Monate</td>
        </tr>
      </tbody>
    </table>
    <hr />
    <blockquote>Eine Nachfolge ist ein Prozess, kein Ereignis.</blockquote>
  </>
)

export const Default: StoryObj<typeof RichText> = {
  render: () => (
    <div className="p-8" lang="de">
      <RichText>{document}</RichText>
    </div>
  ),
}

export const WithoutMeasure: StoryObj<typeof RichText> = {
  render: () => (
    <div className="p-8" lang="de">
      <RichText measure={false}>{document}</RichText>
    </div>
  ),
}

// The narrow column is where German compounds overflow — this is the story the
// hyphenation policy exists for.
export const NarrowColumn: StoryObj<typeof RichText> = {
  render: () => (
    <div className="max-w-[18rem] p-8" lang="de">
      <RichText>
        <h2>Unternehmensnachfolge</h2>
        <p>Beteiligungsgesellschaft und Standortbestimmung in einer schmalen Spalte.</p>
      </RichText>
    </div>
  ),
}
```

- [ ] **Step 3: Write the README section**

Insert after the `Popover` section in `README.md`:

````markdown
## RichText

Tailwind's preflight strips margins, list markers, heading sizes and link
underlines from every element. That is fine for markup you author and wrong for
CMS output, which nobody does. `RichText` puts the semantics back.

```tsx
import { RichText } from '@sankara-ui/core'

<RichText>
  <RichTextRenderer text={blok.text} />
</RichText>
```

The class does the work, so if you already have a wrapper you can skip the
component entirely:

```tsx
<article className="sankara-richtext sankara-richtext-measure">…</article>
```

Covered: block rhythm, `h1`–`h4` (fluid sizes), `h5`/`h6` (weight only), lists
including nesting, links, tables, `hr`, and a minimal `blockquote` fallback. Not
covered, and rendering as plain body text if they appear: `code`/`pre`,
`figure`/`figcaption`, and anything Storyblok adds later. Embedded bloks pass
through untouched but do receive block rhythm as siblings.

### Overriding it

Everything ships in `@layer base` with `:where()` selectors, which means it has
zero specificity and loses to your own rules. Your `@layer base { h2 { … } }`
wins, and so does any Tailwind utility. Tune the rest with the
`--richtext-*` tokens in your own `@theme`.

### Measure

`measure` constrains text to `--richtext-measure` (`68ch`) and is on by default.
It applies to the text children, not the container, so tables, images and
anything marked `data-wide` still use the full width. Pass `measure={false}` to
drop it. It sets width only — centre the column yourself if you want that.

`ch` is the width of a "0" in your typeface, so `68ch` is a different line length
in every brand. Lower the token if your face is wide.

### Hyphenation needs `lang`

Headings hyphenate, which German compounds need — "Unter­nehmens­nachfolge"
otherwise overflows a narrow column. This does nothing without a `lang` attribute,
and the nearest one must describe the *content*: a German page with a French rich
text field needs `<RichText lang="fr">`, not the page's `lang`. `lang` passes
through like any other prop.

`hyphenate-limit-chars`, which keeps short words whole, is not supported
everywhere — where it is missing, short words break too.

### Wide tables

A table with more columns than fit still overflows. Wrapping it in a scroll
container changes the accessibility tree and needs a label, so your renderer owns
that decision.
````

- [ ] **Step 4: Verify the whole gate**

Run: `yarn check`
Expected: typecheck clean, all tests pass, build emits
`dist/components/RichText.js`, `'use client'` still in exactly 3 files.

- [ ] **Step 5: Write the changeset**

```bash
cat > .changeset/richtext.md <<'EOF'
---
'@sankara-ui/core': minor
---

Add `RichText` — the stylesheet contract that makes CMS output readable after
Tailwind's preflight strips it, plus the wrapper component that applies it.

Restores block rhythm, heading sizes and weights, list markers and nesting, link
underlines, tables, `hr` and a `blockquote` fallback, behind six new
`--richtext-*` tokens. Ships in `@layer base` with `:where()` selectors, so every
default loses to your own rules and to any Tailwind utility. Headings hyphenate
for German compounds, which needs a `lang` attribute describing the content.
EOF
```

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/components/RichText.stories.tsx README.md .changeset/richtext.md
git commit -m "feat: export RichText with stories, docs and a changeset"
```

---

### Task 5: Browser verification against a compiled fixture

Almost nothing in this feature is observable in jsdom, and the cascade claims are
only true *after* Tailwind emits its layer order — so the raw stylesheet is not
enough. This pass compiles the package stylesheet the way a consumer would.

**Files:**
- Modify: `docs/specs/2026-08-04-richtext-design.md` (add a `## Verification` section)

**Interfaces:**
- Consumes: the built Storybook from Task 4, plus a compiled Tailwind fixture.
- Produces: a verification record, and either confirmation or a defect list.

- [ ] **Step 1: Build the cascade fixture**

This is the only way to check D3, because Storybook's own CSS pipeline is not a
consumer's. Build it in /tmp, outside the repo:

```bash
mkdir -p /tmp/rt-fixture/pkg && cd /tmp/rt-fixture
npm init -y >/dev/null && npm install tailwindcss @tailwindcss/cli >/dev/null
cp ~/Projects/sahli-interactive/sankara-ui/src/styles/tokens.css pkg/tokens.css
cat > content.html <<'HTML'
<div class="sankara-richtext sankara-richtext-measure" id="rt">
  <h2 id="plain">Unternehmensnachfolge</h2>
  <h2 id="util" class="text-xs">Unternehmensnachfolge</h2>
  <p id="para">Beteiligungsgesellschaft in einer schmalen Spalte.</p>
  <ul id="list"><li>Eins<ul><li>Verschachtelt</li></ul></li></ul>
  <table id="table"><tr><th>Phase</th><td>Analyse</td></tr></table>
</div>
HTML
cat > input.css <<'CSS'
@import "tailwindcss";
@import "./pkg/tokens.css";
@source "./content.html";
@layer base { h2 { font-size: 3rem; font-weight: 900; } }
CSS
npx @tailwindcss/cli -i input.css -o out.css
{ echo '<!doctype html><html lang="de"><head><link rel="stylesheet" href="out.css"></head><body>'
  cat content.html
  echo '</body></html>'; } > page.html
python3 -m http.server 8904 &
```

`page.html` is the fixture: the same markup Tailwind scanned, with the compiled
stylesheet applied. Load `http://localhost:8904/page.html`.

- [ ] **Step 2: Verify the D3 cascade claim against the real stylesheet**

```js
({
  projectRuleWins: getComputedStyle(document.getElementById('plain')).fontSize,  // expect 48px
  projectWeight: getComputedStyle(document.getElementById('plain')).fontWeight,  // expect 900
  utilityWins: getComputedStyle(document.getElementById('util')).fontSize,       // expect 12px
})
```

Expected: the project's `@layer base` rule wins at `48px`/`900`, and the
`text-xs` utility wins at `12px`. If our rule wins instead, D3 is not
implemented as measured and that is a defect — report it, do not adjust the
fixture.

- [ ] **Step 3: Verify the measure exempts wide content**

```js
({
  paragraph: document.getElementById('para').getBoundingClientRect().width,
  table: document.getElementById('table').getBoundingClientRect().width,
  container: document.getElementById('rt').getBoundingClientRect().width,
})
```

Expected at a wide viewport: the paragraph is capped near `68ch`, the table
matches the container width, and the container itself is unconstrained.

- [ ] **Step 4: Verify hyphenation and its `lang` dependency**

At a narrow width (resize to ~320px, or use the `NarrowColumn` story), confirm
"Unternehmensnachfolge" breaks across lines. Then:

```js
document.documentElement.removeAttribute('lang')
document.body.offsetHeight
// re-measure the heading's height or line count
```

Expected: with `lang="de"` the compound hyphenates; with `lang` removed it does
not. That difference is the evidence for the README's claim — if hyphenation
persists without `lang`, the claim is wrong and must be corrected.

Record which behaviour the engine showed for `hyphenate-limit-chars` — whether
short words stayed whole — rather than asserting a universal.

- [ ] **Step 5: Verify the restorations in Storybook**

Load `http://localhost:8905/iframe.html?id=richtext--default&viewMode=story`
after `yarn build-storybook -o /tmp/sb-rt && cd /tmp/sb-rt && python3 -m http.server 8905 &`.

Confirm by measurement or screenshot: list markers visible with nested markers
differing, ordered list numbered, table borders present, `hr` visible,
`blockquote` indented with its border, links underlined, and heading sizes
changing between a narrow and a wide viewport (the clamp).

- [ ] **Step 6: Verify the flow spacing property**

In the same story, confirm every direct child except the first has a top margin
of `--richtext-flow`, including around the table — the documented D7 property
that the owl spaces everything equally.

- [ ] **Step 7: Record the results in the spec**

Add a `## Verification` section to
`docs/specs/2026-08-04-richtext-design.md`, before `## Risks and open questions`,
matching the format of the one in `docs/specs/2026-08-02-popover-design.md`.
State the browser and version, and state explicitly what remains unobserved:
other engines, real screen readers, and `hyphenate-limit-chars` behaviour outside
the engine tested.

- [ ] **Step 8: Clean up and commit**

```bash
pkill -f "http.server 8904"; pkill -f "http.server 8905"
rm -rf /tmp/rt-fixture /tmp/sb-rt
git add docs/specs/2026-08-04-richtext-design.md
git commit -m "docs: record the RichText browser verification"
```

---

## Note on the estate's `.richtext` classes

This does not replace them. A project keeps its own `.richtext` and its list
variants (`.feature-list`, `.-pros-list`); adopting `RichText` means adding the
package class alongside, or migrating rule by rule. Because the package's rules
have zero specificity and sit in `base`, an existing `.richtext` rule wins every
collision — migration can be gradual and cannot regress a project that keeps both.
