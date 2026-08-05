# `Heading` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `Heading` component that decouples a heading's semantic level
from its visual level, plus token-driven size defaults for `.h1`–`.h4`.

**Architecture:** `<Heading level={3} visual={4}>` renders `<h3 class="h4">`.
The class is always emitted, even when the two levels match. The package styles
only the classes it emits — never the bare `h1`–`h6` tags — with `font-size` and
`line-height` in `@layer base`, so installing the package restyles nothing a
consumer authored, and a consumer's own rules win.

**Tech Stack:** React 19 server component, TypeScript (`module: nodenext`),
Tailwind v4 `@theme` tokens, vitest + jsdom + `@testing-library/react`,
Storybook 9, changesets.

**Spec:** `docs/specs/2026-08-05-heading-design.md`. Read it before starting;
the decision IDs (D1–D6) referenced below live there.

**Branch:** `feat/heading`, already created and holding the spec commits.

## Global Constraints

- **Relative imports must carry the `.js` extension** (`../utilities/cn.js`)
  even from `.ts`/`.tsx` sources — `module: nodenext` +
  `verbatimModuleSyntax`. Extensionless imports fail typecheck.
- **No `'use client'`.** `Heading` has no hooks and no handlers; it stays a
  server component. `scripts/check-directives.mjs` runs in `yarn build`.
- **Token contract, three places in sync:** `src/styles/tokens.ts` (`TOKENS`
  array), `src/styles/tokens.css` (`@theme` defaults), and the README table.
  `src/styles/tokens.test.ts` fails if a `TOKENS` entry has no CSS default.
- **Every CSS rule ships inside a layer.** An unlayered rule beats every
  layered one regardless of specificity, including a consumer's utilities.
- **The heading block ships in `@layer base`, styling classes only.** A bare
  `h1 { }` or an `h1, .h1 { }` twin in this package restyles every consumer's
  site and is the defect Task 1's tests exist to catch.
- **Exact token values**, copied verbatim:
  - `--heading-1: clamp(2.25rem, 1.73rem + 2.21vw, 3.5rem)`
  - `--heading-2: clamp(1.875rem, 1.72rem + 0.66vw, 2.25rem)`
  - `--heading-3: clamp(1.25rem, 0.99rem + 1.1vw, 1.875rem)`
  - `--heading-4: clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)`
- **Line-heights**, copied verbatim: `.h1` `1.1`, `.h2` `1.15`, `.h3` `1.2`,
  `.h4` `1.3`.
- **No `font-weight`, `font-family`, `color` or `margin`** anywhere in the
  heading block (D5). These are the columns the five surveyed projects disagree
  on, and a test enforces their absence.
- **No `.h5`/`.h6` rule** (D6). The classes are emitted; the package defines
  nothing for them.
- `yarn check` (`typecheck` + `test` + `build`) is the gate. Run it before the
  final commit of every task that touches `src/`.
- Never commit to `main`. Never push without asking.

---

### Task 1: Tokens and the stylesheet contract

**Files:**
- Modify: `src/styles/tokens.ts` — add four entries to `TOKENS`
- Modify: `src/styles/tokens.css` — add four `@theme` defaults, and append the
  heading block at the end of the file
- Modify: `src/styles/tokens.test.ts` — strengthen the `@theme` assertion,
  add a layer-placement case for the heading block
- Create: `src/styles/heading-css.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS classes `.h1`–`.h4` and the tokens `--heading-1` …
  `--heading-4`. Task 2's component emits `h${visual}` class names that these
  rules match. Task 3 documents the same four tokens in the README table.

- [ ] **Step 1: Write the failing stylesheet contract test**

Create `src/styles/heading-css.test.ts`. This is modelled on the existing
`src/styles/richtext-css.test.ts` — read that file first; the prelude scanner
below is the same technique and exists for the same reason.

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

```sh
yarn vitest run src/styles/heading-css.test.ts
```

Expected: FAIL. `block` is empty because `tokens.css` has no `/* Page headings`
marker yet, so `indexOf` returns `-1` and the slice is wrong — the first test
fails on `toContain`, and the `.h1`–`.h4` cases fail on missing rules.

- [ ] **Step 3: Add the four tokens to the `TOKENS` array**

In `src/styles/tokens.ts`, append after `'--richtext-h4',`:

```ts
  '--heading-1',
  '--heading-2',
  '--heading-3',
  '--heading-4',
```

- [ ] **Step 4: Add the four `@theme` defaults**

In `src/styles/tokens.css`, inside the existing `@theme { … }` block, after
`--richtext-h4`:

```css
  --heading-1: clamp(2.25rem, 1.73rem + 2.21vw, 3.5rem);
  --heading-2: clamp(1.875rem, 1.72rem + 0.66vw, 2.25rem);
  --heading-3: clamp(1.25rem, 0.99rem + 1.1vw, 1.875rem);
  --heading-4: clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem);
```

- [ ] **Step 5: Append the heading block to `tokens.css`**

At the very end of `src/styles/tokens.css`, after the `/* END rich text */`
marker:

```css
/* Page headings. The class only — never `h1, .h1` — because this package is
   installed into projects that already have their own heading CSS, and a bare
   tag rule here would restyle every heading on their site. A hand-written
   <h1> carrying no class is untouched; only what `Heading` emits is styled.
   See the Heading spec's D4.

   In @layer base, at specificity (0,1,0). That beats Tailwind's preflight
   (`h1, …, h6 { font-size: inherit; font-weight: inherit }`, (0,0,1), same
   layer) on specificity alone — unlike the rich text block above, this does
   not depend on source order to apply at all. A consumer's own `.h1` ties at
   (0,1,0) and wins on source order per the README's install order; a rule of
   theirs that is unlayered, or in components/utilities, wins outright.

   Size and line-height only. Weight, family, colour and margin are where the
   five surveyed projects disagree — 400 to 800, four different families,
   `margin: 0` to `mb-12` — so a default in those columns is something
   consumers fight rather than build on. heading-css.test.ts enforces their
   absence.

   Line-height is not optional: preflight resets none on headings, so a 56px
   h1 would inherit `html`'s 1.5 and render on 84px leading.

   No .h5/.h6: only one surveyed project sizes them, and an unweighted 16px
   .h6 is indistinguishable from the body copy beside it. Those classes are
   emitted as bare hooks. */
@layer base {
  .h1 {
    font-size: var(--heading-1);
    line-height: 1.1;
  }

  .h2 {
    font-size: var(--heading-2);
    line-height: 1.15;
  }

  .h3 {
    font-size: var(--heading-3);
    line-height: 1.2;
  }

  .h4 {
    font-size: var(--heading-4);
    line-height: 1.3;
  }
}
/* END headings */
```

- [ ] **Step 6: Run the stylesheet test to verify it passes**

```sh
yarn vitest run src/styles/heading-css.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 7: Prove the bare-tag guard actually catches the thing it exists for**

Temporarily change the `.h1` selector in `tokens.css` to `h1, .h1`, then:

```sh
yarn vitest run src/styles/heading-css.test.ts
```

Expected: FAIL on `targets classes only, never a bare heading tag`, reporting
`["h1, .h1"]`. **Revert the change** and re-run to confirm PASS. Do the same
for one declaration guard: add `font-weight: 700` to `.h1`, confirm the
`ships no font-weight declaration` case fails, revert.

- [ ] **Step 8: Strengthen the `@theme` assertion in `tokens.test.ts`**

The existing test checks that each token appears somewhere in the file *and*,
separately, that some `@theme {` block exists — so a token declared outside
`@theme` passes both. A token outside `@theme` is not a Tailwind theme variable
and cannot be overridden from a consumer's own `@theme`, which is the override
path the whole design rests on.

Replace the `declares the defaults inside an @theme block` test in
`src/styles/tokens.test.ts` with:

```ts
  it('declares every token inside the @theme block', () => {
    const open = css.indexOf('@theme')
    expect(open).toBeGreaterThanOrEqual(0)
    // Walk to the matching close brace rather than regexing to the first `}`,
    // which would stop at the first nested rule.
    let depth = 0
    let end = -1
    for (let i = css.indexOf('{', open); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    expect(end).toBeGreaterThan(open)
    const theme = css.slice(open, end)
    const outside = TOKENS.filter(token => !theme.includes(`${token}:`))
    expect(outside).toEqual([])
  })
```

- [ ] **Step 9: Add the layer-placement case for the heading block**

`tokens.test.ts`'s `cascade layering` suite matches by selector substring —
`sankara-richtext` must be in `base`, `sankara-(button|dialog|disclosure|popover)`
must be in `components`. `.h1` matches neither, so without a case naming it the
block could drift into `components` and nothing would fail.

Add to the `cascade layering` describe block, after the existing cases:

```ts
  it('ships the heading defaults in base so a project can override them', () => {
    const misplaced = rules
      .filter(rule => /^\.h[1-6]$/.test(rule.selector) && rule.layer !== 'base')
      .map(rule => rule.selector)
    expect(misplaced).toEqual([])
  })
```

- [ ] **Step 10: Run the full suite**

```sh
yarn check
```

Expected: PASS. If `declares every token inside the @theme block` fails for a
pre-existing token, that is a real finding — report it rather than weakening
the test.

- [ ] **Step 11: Commit**

```bash
git add src/styles/tokens.ts src/styles/tokens.css src/styles/tokens.test.ts src/styles/heading-css.test.ts
git commit -m "feat: add the page heading scale, on the class only

Four tokens and .h1-.h4 rules in @layer base. The package styles only the
classes Heading emits, never the bare tags, so installing it restyles nothing
a consumer authored. Size and line-height only -- weight, family, colour and
margin are where the five surveyed projects disagree.

Also strengthens tokens.test.ts, which proved each token existed and that an
@theme block existed, but never that the two were related."
```

---

### Task 2: The component

**Files:**
- Create: `src/components/Heading.tsx`
- Create: `src/components/Heading.test.tsx`
- Modify: `src/index.ts` — add the barrel export

**Interfaces:**
- Consumes: `cn` from `../utilities/cn.js`; the `.h1`–`.h4` classes from Task 1.
- Produces:
  - `export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6`
  - `export type HeadingProps = Omit<ComponentPropsWithRef<'h1'>, 'children'> & { children: ReactNode; level: HeadingLevel; visual?: HeadingLevel }`
  - `export function Heading(props: HeadingProps): JSX.Element`
  - Task 3's story and README import `Heading` and `HeadingProps` by these
    exact names.

- [ ] **Step 1: Write the failing component test**

Create `src/components/Heading.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Heading, type HeadingLevel } from './Heading.js'

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement
const levels: HeadingLevel[] = [1, 2, 3, 4, 5, 6]

describe('Heading', () => {
  it.each(levels)('renders level %i as its matching tag', level => {
    const { container } = render(<Heading level={level}>Titel</Heading>)
    expect(root(container).tagName).toBe(`H${level}`)
  })

  // D3: emitted even when it matches `level`. Projects shaped like numbers.ch
  // define `.h1` and no `h1` rule, where the class is the only thing that
  // renders a heading at all.
  it.each(levels)('emits the class for level %i even with no visual override', level => {
    const { container } = render(<Heading level={level}>Titel</Heading>)
    expect(root(container)).toHaveClass(`h${level}`)
  })

  // The estate's dominant call site, 29 occurrences: a card title demoted
  // visually, kept correct in the outline.
  it('decouples the visual level from the semantic one', () => {
    const { container } = render(
      <Heading level={3} visual={4}>
        Kartentitel
      </Heading>
    )
    expect(root(container).tagName).toBe('H3')
    expect(root(container)).toHaveClass('h4')
    expect(root(container)).not.toHaveClass('h3')
  })

  it('merges className rather than replacing it', () => {
    const { container } = render(
      <Heading level={2} visual={4} className="mb-0 text-brown">
        Titel
      </Heading>
    )
    expect(root(container)).toHaveClass('h4', 'mb-0', 'text-brown')
  })

  it('passes rest props and ref through to the element', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(
      <Heading level={2} id="anchor" lang="de" ref={ref}>
        Titel
      </Heading>
    )
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveAttribute('id', 'anchor')
    expect(heading).toHaveAttribute('lang', 'de')
    expect(ref.current).toBe(heading)
  })

  it('renders children with no wrapper of its own', () => {
    const { container } = render(
      <Heading level={2}>
        Wir beraten <em>Sie</em> gern
      </Heading>
    )
    expect(root(container).querySelector('em')?.textContent).toBe('Sie')
    expect(root(container).children).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```sh
yarn vitest run src/components/Heading.test.tsx
```

Expected: FAIL — `Failed to resolve import "./Heading.js"`.

- [ ] **Step 3: Write the component**

Create `src/components/Heading.tsx`:

```tsx
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

// WithRef, not WithoutRef: under React 19 `ref` is an ordinary prop on function
// components, so it rides along in the spread — as in Disclosure and RichText.
// 'h1' is not an h1-specific choice: all six heading tags are HTMLHeadingElement.
export type HeadingProps = Omit<ComponentPropsWithRef<'h1'>, 'children'> & {
  children: ReactNode
  /** Semantic level — the document outline. Renders <h1>…<h6>. */
  level: HeadingLevel
  /** Visual level — emits `h1`…`h6`. Defaults to `level`. The package ships
      size defaults for 1–4 only; 5 and 6 are hooks for your own CSS. */
  visual?: HeadingLevel
}

export function Heading({
  level,
  visual = level,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as `h${HeadingLevel}`
  // The class is emitted even when it matches `level`. Four of the five
  // surveyed projects write an `hN, .hN` twin, where the duplicate is inert;
  // the fifth defines `.hN` and no tag rule at all, where the class is the
  // only thing that renders a heading. One behaviour covers both, and no
  // consumer has to know which kind of project they are in.
  return (
    <Tag className={cn(`h${visual}`, className)} {...props}>
      {children}
    </Tag>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```sh
yarn vitest run src/components/Heading.test.tsx
```

Expected: PASS, all cases.

If `const Tag = \`h${level}\` as \`h${HeadingLevel}\`` trips the typechecker,
do not reach for `any`. The fallback is an explicit map, which is equally
static and equally typed:

```tsx
const TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const
// …
const Tag = TAGS[level]
```

- [ ] **Step 5: Prove the tests fail on mutation**

Make each change, confirm the named test fails, then revert:

1. Drop the class: `className={cn(className)}` → `emits the class for level %i`
   fails for all six.
2. Ignore `visual`: `cn(\`h${level}\`, className)` → `decouples the visual level`
   fails.
3. Drop the spread: remove `{...props}` → `passes rest props and ref through`
   fails.
4. Hardcode the tag: `const Tag = 'h2'` → `renders level %i as its matching tag`
   fails for five of six.

- [ ] **Step 6: Add the barrel export**

In `src/index.ts`, after the `RichText` line:

```ts
export { Heading, type HeadingProps, type HeadingLevel } from './components/Heading.js'
```

`Heading` has no optional peer dependency, so nothing about `Icon`'s separate
export path applies — it belongs in the barrel like every other component.

- [ ] **Step 7: Run the full gate**

```sh
yarn check
```

Expected: PASS. `check-directives.mjs` must not complain — `Heading.tsx`
declares no `'use client'` and must not gain one.

- [ ] **Step 8: Commit**

```bash
git add src/components/Heading.tsx src/components/Heading.test.tsx src/index.ts
git commit -m "feat: add Heading, the semantic/visual split as two typed props

level drives the tag, visual drives the class, and the class is emitted even
when they match -- projects that define .hN and no tag rule need it, and in
projects that define both the duplicate is inert."
```

---

### Task 3: Story, README and changeset

**Files:**
- Create: `src/components/Heading.stories.tsx`
- Modify: `README.md` — four token table rows, a `## Heading` section
- Create: `.changeset/<generated-name>.md`

**Interfaces:**
- Consumes: `Heading`, `HeadingProps` from Task 2; the four tokens from Task 1.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the story**

Create `src/components/Heading.stories.tsx`. Model the file header on
`src/components/RichText.stories.tsx`. German copy, matching the estate.

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading.js'

const meta: Meta<typeof Heading> = { component: Heading, title: 'Heading' }
export default meta

type Story = StoryObj<typeof Heading>

// The package ships size and line-height only. Weight, family and colour are
// the consumer's, so these stories add a weight inline to look like a real
// site rather than to demonstrate anything the package provides.
export const Scale: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={1}>Unternehmensnachfolge (h1)</Heading>
      <Heading level={2}>Unsere Leistungen (h2)</Heading>
      <Heading level={3}>Nachfolgeplanung (h3)</Heading>
      <Heading level={4}>Erstgespräch (h4)</Heading>
      <Heading level={5}>Ohne Paketgrösse (h5)</Heading>
      <Heading level={6}>Ohne Paketgrösse (h6)</Heading>
    </div>
  ),
}

// The estate's dominant shape, 29 occurrences: a card title that is an h3 in
// the outline and an h4 on screen.
export const DemotedCardTitle: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={2}>Sektionstitel, h2 und h2</Heading>
      <Heading level={3} visual={4}>
        Kartentitel, h3 im Outline und h4 auf dem Bildschirm
      </Heading>
    </div>
  ),
}

// h5 and h6 carry no package rule (D6), so they render at body size until the
// consumer defines those classes. This story is what that looks like.
export const UnstyledHooks: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={4}>h4 — sized by the package</Heading>
      <Heading level={5}>h5 — a bare hook, body-sized</Heading>
    </div>
  ),
}
```

- [ ] **Step 2: Check the story renders**

```sh
yarn storybook
```

Open <http://localhost:6006>, find **Heading**, and confirm: `Scale` shows four
distinct sizes for h1–h4 with h5/h6 at body size; `DemotedCardTitle` shows the
second heading smaller than the first while being an `<h3>` (check in devtools);
`UnstyledHooks` shows the h5 at body size. Stop the server when done.

- [ ] **Step 3: Add the four token rows to the README table**

In `README.md`, in the `## Theming` table, after the `--richtext-h4` row:

```markdown
| `--heading-1` | `Heading` `.h1` size, fluid — page headings, not rich text |
| `--heading-2` | `Heading` `.h2` size, fluid |
| `--heading-3` | `Heading` `.h3` size, fluid |
| `--heading-4` | `Heading` `.h4` size, fluid |
```

The first row's qualifier matters: `--richtext-h1` and `--heading-1` are
different scales for different jobs (a page title is larger than a heading
inside body copy), and the close names are the one thing most likely to confuse
a consumer.

- [ ] **Step 4: Write the README section**

Add a `## Heading` section to `README.md`, placed after `## RichText` and
before `## Dialog`, matching the surrounding voice:

````markdown
## Heading

A heading's level in the document outline and its size on screen are two
different decisions. A card title is an `h3` for screen readers and looks like
an `h4`. `Heading` makes that two props instead of a tag and a hand-written
class.

```tsx
import { Heading } from '@sankara-ui/core'

<Heading level={3} visual={4}>{blok.headline}</Heading>
// → <h3 class="h4">…</h3>
```

`level` is required — the outline decision is never implicit. `visual` defaults
to `level`, and the class is emitted either way, so `<Heading level={2}>`
renders `<h2 class="h2">`.

### What it styles

`.h1`–`.h4` get a `font-size` from `--heading-1`–`--heading-4` and a
`line-height`. Nothing else — no weight, family, colour or margin. Those differ
in every project, and a package default in those columns is something you fight
rather than build on.

Two consequences worth knowing before you file a bug:

- **Headings render at body weight** until you set one. Tailwind's preflight
  sets `font-weight: inherit` on `h1`–`h6`. Add `.h1, .h2, .h3, .h4 { font-weight: 700 }`
  — or whatever your brand uses — to your own base styles.
- **`.h5` and `.h6` carry no rule at all.** They are emitted as hooks for your
  own CSS.

### Overriding it

The rules ship in `@layer base` on the class alone — `.h1`, never `h1, .h1` —
so installing this package changes nothing about headings you wrote yourself.
Only what `Heading` emits is styled.

To override, define the class in your own stylesheet:

```css
@layer base {
  h1, .h1 { @apply font-display text-5xl font-extrabold md:text-7xl; }
}
```

That ties the package's rule and wins on source order, which is why the install
order above matters. A rule of yours that is unlayered, or in `@layer components`
or `@layer utilities`, wins outright regardless of order.

**One sharp edge.** If you style the bare tag *only* — `h1 { … }` with no `.h1`
— the package's `.h1` wins, because a class beats a type selector. Add the
class to your existing selector and you are back in control. Every project this
package was derived from already writes the pair.

### Levels from a CMS

A Storyblok level field is usually a string option list (`"h2" | "h3" | …`),
while `level` is a number. Map it at the call site:

```tsx
<Heading level={Number(blok.level?.slice(1) ?? 2) as 1 | 2 | 3 | 4 | 5 | 6}>
  {blok.headline}
</Heading>
```

The component does not validate at runtime: a TypeScript caller gets a compile
error, and `level={7}` from untyped JavaScript renders an invalid `<h7>` rather
than throwing.

### Don't pass a second heading class

`<Heading level={2} visual={4} className="h1">` emits `class="h4 h1"`, and class
order in the attribute decides nothing — whichever rule sits later in the
stylesheet wins. `visual` is authoritative only when it is the only heading
class on the element.
````

- [ ] **Step 5: Add the changeset**

```sh
yarn changeset
```

Choose a **minor** bump (new component, still `0.x`). Use this summary:

```
Add `Heading`, which splits a heading's semantic level from its visual level:
`<Heading level={3} visual={4}>` renders `<h3 class="h4">`. Ships `font-size`
and `line-height` defaults for `.h1`-`.h4` behind four new tokens, on the
classes only — never the bare `h1`-`h6` tags — so installing it restyles no
heading you wrote yourself.
```

- [ ] **Step 6: Run the full gate**

```sh
yarn check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Heading.stories.tsx README.md .changeset
git commit -m "docs: document Heading, its two omitted columns and its sharp edge

Records what the package deliberately does not ship (weight, family, colour,
margin, .h5/.h6) so a consumer reads it as a decision rather than a bug, and
names the one case where the package's class beats a consumer's own rule."
```

---

### Task 4: Browser verification

**Files:**
- Create: fixture files under the scratchpad directory (not the repo)
- Modify: `docs/specs/2026-08-05-heading-design.md` — add a `## Verification`
  section recording what was measured

**Interfaces:**
- Consumes: the built stylesheet from Task 1, the component from Task 2.
- Produces: nothing in `src/`.

Every claim in the spec's D4 cascade table is a compiled-CSS claim. The raw
stylesheet cannot settle any of it, because the layer order only exists after
Tailwind emits it. This package has twice found defects that were invisible any
other way.

- [ ] **Step 1: Build the compiled fixture**

Create a consumer-shaped project in the session scratchpad — **not** in the
repo, which would drag `node_modules` and a second Tailwind install into a
package that has no bundler:

```sh
FIXTURE="$SCRATCHPAD/heading-fixture"   # the scratchpad path from your system prompt
mkdir -p "$FIXTURE" && cd "$FIXTURE"
npm init -y
npm i tailwindcss @tailwindcss/cli
```

`entry.css`, following the README's documented install order:

```css
@import "tailwindcss";
@import "./tokens.css";
@source "./fixture.html";
```

Copy the package's `src/styles/tokens.css` next to it. Then compile:

```sh
npx @tailwindcss/cli -i entry.css -o out.css
```

- [ ] **Step 2: Write the fixture markup**

`fixture.html` must contain, each with an id so it can be queried:

- `<h2 class="h2" id="bare">` — a bare project, no consumer CSS
- `<h3 class="h4" id="demoted">` — the mismatched shape
- `<h1 id="untouched">` — hand-written, no class
- `<h2 class="h2 text-xs" id="utility">` — utility competing with the package
- `<h5 class="h5" id="hook">` — the D6 no-rule case

- [ ] **Step 3: Measure the bare project**

Load `fixture.html` in Chrome and read `getComputedStyle` synchronously, after
forcing layout with `document.body.offsetHeight`. The automated tab reports
`visibilityState: "hidden"`, so `requestAnimationFrame` never fires — do not
await it.

Record for each element: `fontSize`, `lineHeight`, `fontWeight`.

Expected: `#bare` at the `--heading-2` clamp (not preflight's inherited 16px),
`#demoted` at the `--heading-4` clamp, `#untouched` at preflight's inherited
size — **unchanged by the package**, `#hook` at body size, and every one of
them at body `font-weight` since D5 ships none.

- [ ] **Step 4: Measure the four competing-rule rows of D4's table**

Add each consumer rule to the fixture in turn, recompile, and measure `#bare`:

| Consumer rule | Expected |
| --- | --- |
| `@layer base { h2, .h2 { font-size: 3rem } }` | 48px — theirs wins |
| unlayered `.h2 { font-size: 3rem }` | 48px — theirs wins |
| `@layer components { .h2 { font-size: 3rem } }` | 48px — theirs wins |
| `@layer base { h2 { font-size: 3rem } }` — bare tag only | **package wins** — the documented hazard, confirmed rather than reasoned about |

Also measure `#utility`: `text-xs` must win at 12px.

- [ ] **Step 5: Measure the clamp across two viewport widths**

`resize_window` did not move `window.innerWidth` in the automated tab across
two previous sessions. The technique that worked: inject a same-origin
`<iframe>` of a set width and read inside it — `vw` resolves against an
iframe's own initial containing block, so it is a real distinct viewport for
CSS purposes.

Measure `--heading-1` at a narrow and a wide width and confirm the value
**moves**, not merely that it resolves. Per the spec's Tokens table the
ceiling engages at 1281px, so use something comfortably above it.

- [ ] **Step 6: Write the `## Verification` section**

Add it to the spec, before `## Risks and open questions`. Record the Chrome
version, and for **every** claim, which fixture and which viewport produced it.

A previous component's verification section needed a 53-claim audit because
measurements were attributed to runs that never produced them. Do not write a
row you did not measure. If a check was not run, say so under an explicit
**Unobserved** heading, along with: other engines, and whether a real
consumer's bundler preserves the import order the fixtures assume by
construction.

- [ ] **Step 7: Commit**

```bash
git add docs/specs/2026-08-05-heading-design.md
git commit -m "docs: record the Heading browser verification pass

Confirms D4's cascade table against a compiled Tailwind fixture, including the
bare-tag hazard, which is now measured rather than reasoned about."
```

---

## Done when

- [ ] `yarn check` passes.
- [ ] `Heading` is exported from `src/index.ts` and renders in Storybook.
- [ ] The stylesheet block targets classes only, proven by a test that fails
      when a bare tag is introduced.
- [ ] D4's cascade table is confirmed in a compiled fixture, including the
      hazard row.
- [ ] A changeset is committed.
- [ ] Ask before pushing.
