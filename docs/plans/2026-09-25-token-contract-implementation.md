# Token Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `@sankara-ui/core`'s token contract to shadcn/ui role names in 0.10.0 without visually changing any consumer, then ship a starter theme in `next-storyblok-template` that rebrands from one palette block.

**Architecture:** New role tokens are added to the package's `@theme`, each defaulting to `var(<deprecated name>)`, so an override of either name drives the component. Component rules switch to the new names. Section theming is a README recipe, not package CSS. The template consumes 0.10.0 once it is published.

**Tech Stack:** Tailwind CSS 4.3 (`@theme`, `@tailwindcss/postcss`), vitest (node environment for stylesheet tests), changesets, Next 16 (template).

**Spec:** `docs/specs/2026-09-25-token-contract-design.md`

## Global Constraints

- Release is **minor: 0.9.0 → 0.10.0**. Old names stay until 1.0.
- Every new token that replaces an old one defaults to exactly `var(<old>)`; no literal defaults for replacements before 1.0.
- `--color-background: oklch(1 0 0)` and `--color-foreground: oklch(0.25 0.02 275)` — the current `surface`/`on-surface` literals.
- No shadcn `--color-muted` background, no `--radius`, no fonts in the package (D4, D5).
- No component TSX changes; this is `tokens.css`, `tokens.ts`, tests, stories, README, CLAUDE.md, changeset.
- Every rule stays inside a cascade layer (`layer-order.test.ts` / `tokens.test.ts` enforce this).
- sankara-ui work happens on branch `feat/token-contract` (already created from `origin/main`, holds the spec). Commit after each task; do not push without asking.
- sankara-ui gate: `yarn check` (typecheck + test + build). Template gate: `yarn check` and `yarn build`, then `git checkout -- next-env.d.ts`.
- Template: never commit on `main`; never edit `.env*`.

## Review Focus

1. **A consumer overrides an old name only** (djalicunda: `--color-surface`, `--color-muted`, `--color-focus`) — the package reads the replacement, which must still resolve to the consumer's value. Pinned in Task 1 (`theme-aliases.test.ts`).
2. **An old name referenced only through an alias** (no utility in markup, e.g. `--color-muted` reached via `--color-input` → `--color-border`) — Tailwind must not prune it. Pinned in Task 1.
3. **Old utilities in consumer markup** (`text-muted`, 20 uses in djalicunda; `text-primary-contrast`) keep generating. Pinned in Task 1.
4. **The D6 recipe misses a colour the package reads** — a band then shows root-coloured focus rings or dots. Pinned in Task 4 (`band-recipe.test.ts` cross-checks the README recipe against every read in `tokens.css`).
5. **Template brand contrast** — the template's teal `#09b3af` with a white foreground is ~2.6:1 and fails WCAG AA for text; the starter theme uses ink on teal. Checked in Task 6, Step 4.

Deliberately not tested: that an old name overridden *on an element* does not re-resolve an inherited alias (spec Testing 1, fourth bullet). That is CSS custom-property inheritance, not package code, and jsdom does not compute it; the README documents it instead (Task 4).

---

### Task 1: Role tokens and their aliases

**Files:**
- Create: `src/styles/theme-aliases.test.ts`
- Modify: `src/styles/tokens.css:1-26` (the `@theme` block)
- Modify: `src/styles/tokens.ts`
- Modify: `src/styles/tokens.test.ts`
- Modify: `src/index.ts:5`

**Interfaces:**
- Produces: CSS custom properties `--color-background`, `--color-foreground`, `--color-primary-foreground`, `--color-card`, `--color-card-foreground`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-destructive`, `--color-accent`, `--color-accent-foreground`; TS export `DEPRECATED_TOKENS: { readonly [old: string]: string }` (old → new) from `src/styles/tokens.ts` and the package barrel.

- [ ] **Step 1: Write the failing tests**

Append to `src/styles/tokens.test.ts` (change the import line to `import { DEPRECATED_TOKENS, TOKENS } from './tokens.js'`), inside the `describe('token contract', …)` block:

```ts
  it('points every replacement token at the name it deprecates', () => {
    const wrong = Object.entries(DEPRECATED_TOKENS).filter(
      ([old, next]) => !css.includes(`${next}: var(${old});`)
    )
    expect(wrong).toEqual([])
  })

  it('keeps both halves of every deprecation in the documented contract', () => {
    const listed = new Set<string>(TOKENS)
    const missing = Object.entries(DEPRECATED_TOKENS)
      .flat()
      .filter(token => !listed.has(token))
    expect(missing).toEqual([])
  })
```

Create `src/styles/theme-aliases.test.ts`:

```ts
// @vitest-environment node
import postcss, { type Root, type Rule } from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { describe, expect, it } from 'vitest'
import { DEPRECATED_TOKENS } from './tokens.js'

// Compiles the package the way a consumer does -- package first, the
// consumer's own @theme after it -- and reads the emitted :root variables.
// tokens.test.ts only greps the source; this checks what Tailwind actually
// keeps after pruning unused theme variables. See the token contract spec, D2.
const entry = new URL('./tokens.css', import.meta.url).pathname

const compile = async (consumerTheme: string, candidates: string[]) =>
  (
    await postcss([tailwind({ optimize: false })]).process(
      `@import "tailwindcss" source(none);\n@import "${entry}";\n` +
        `@theme {\n${consumerTheme}\n}\n@source inline("${candidates.join(' ')}");\n`,
      { from: entry }
    )
  ).root

function rootVars(root: Root) {
  const vars = new Map<string, string>()
  root.walkDecls(/^--/, decl => {
    if ((decl.parent as Rule | undefined)?.selector?.includes(':root')) vars.set(decl.prop, decl.value)
  })
  return vars
}

// Follows var(--x) references to a literal, the way the browser would at :root.
function resolve(vars: Map<string, string>, name: string): string | undefined {
  let value = vars.get(name)
  for (let hops = 0; value && hops < 10; hops += 1) {
    const ref = value.match(/^var\((--[\w-]+)\)$/)?.[1]
    if (!ref) return value
    value = vars.get(ref)
  }
  return value
}

const OVERRIDE = '#123456'

describe('deprecated token aliases in a compiled consumer build', () => {
  it.each(Object.entries(DEPRECATED_TOKENS))(
    'an override of %s still drives %s',
    async (old, next) => {
      const utility = `bg-${next.replace('--color-', '')}`
      const vars = rootVars(await compile(`${old}: ${OVERRIDE};`, [utility]))
      expect(resolve(vars, next)).toBe(OVERRIDE)
    }
  )

  it.each(Object.entries(DEPRECATED_TOKENS))(
    'an override of the replacement %s → %s wins outright',
    async (_old, next) => {
      const utility = `bg-${next.replace('--color-', '')}`
      const vars = rootVars(await compile(`${next}: ${OVERRIDE};`, [utility]))
      expect(resolve(vars, next)).toBe(OVERRIDE)
    }
  )

  it('keeps an old name reached only through package CSS, with no utility in markup', async () => {
    // .sankara-field-control reads --color-input -> --color-border -> --color-muted.
    const vars = rootVars(await compile(`--color-muted: ${OVERRIDE};`, []))
    expect(resolve(vars, '--color-input')).toBe(OVERRIDE)
  })

  it('still generates the old utilities consumers already use', async () => {
    const root = await compile('', ['text-muted', 'text-primary-contrast', 'bg-surface'])
    const css = root.toString()
    expect(css).toMatch(/\.text-muted \{[^}]*var\(--color-muted\)/)
    expect(css).toMatch(/\.text-primary-contrast \{[^}]*var\(--color-primary-contrast\)/)
    expect(css).toMatch(/\.bg-surface \{[^}]*var\(--color-surface\)/)
  })

  it('leaves an unthemed package looking as it did in 0.9.0', async () => {
    const vars = rootVars(await compile('', ['bg-card', 'bg-background', 'text-foreground']))
    expect(resolve(vars, '--color-card')).toBe('oklch(1 0 0)')
    expect(resolve(vars, '--color-background')).toBe('oklch(1 0 0)')
    expect(resolve(vars, '--color-foreground')).toBe('oklch(0.25 0.02 275)')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/styles/tokens.test.ts src/styles/theme-aliases.test.ts`
Expected: FAIL — `DEPRECATED_TOKENS` is not exported (TypeScript/import error), or the new tokens resolve to `undefined`.

- [ ] **Step 3: Implement**

In `src/styles/tokens.css`, append inside the `@theme { … }` block, after `--field-accent: var(--color-primary);`:

```css

  /* Role tokens under shadcn/ui's names -- see
     docs/specs/2026-09-25-token-contract-design.md. Until 1.0 every one that
     replaces an older name defaults to it, so a consumer's override of the old
     name keeps driving the component. Aliases resolve at :root: a section that
     re-themes itself must set these names, not the deprecated ones. */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.25 0.02 275);
  --color-primary-foreground: var(--color-primary-contrast);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-on-surface);
  --color-muted-foreground: var(--color-muted);
  --color-border: var(--color-muted);
  --color-input: var(--color-border);
  --color-ring: var(--color-focus);
  --color-destructive: var(--color-error);
  --color-accent: var(--color-primary);
  --color-accent-foreground: var(--color-primary-foreground);
```

In `src/styles/tokens.ts`, add the twelve names to the end of `TOKENS` (before `] as const`):

```ts
  '--color-background',
  '--color-foreground',
  '--color-primary-foreground',
  '--color-card',
  '--color-card-foreground',
  '--color-muted-foreground',
  '--color-border',
  '--color-input',
  '--color-ring',
  '--color-destructive',
  '--color-accent',
  '--color-accent-foreground',
```

and append:

```ts

/** Deprecated name → its replacement. The replacement defaults to `var(<old>)`
    until 1.0 removes the old name. */
export const DEPRECATED_TOKENS = {
  '--color-primary-contrast': '--color-primary-foreground',
  '--color-surface': '--color-card',
  '--color-on-surface': '--color-card-foreground',
  '--color-muted': '--color-muted-foreground',
  '--color-focus': '--color-ring',
  '--color-error': '--color-destructive',
} as const
```

In `src/index.ts`, change line 5 to:

```ts
export { DEPRECATED_TOKENS, TOKENS } from './styles/tokens.js'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run src/styles/tokens.test.ts src/styles/theme-aliases.test.ts`
Expected: PASS, all cases. If "keeps an old name reached only through package CSS" fails, Tailwind prunes transitively referenced variables in this version: stop and report — the spec's D2 verification is then wrong and needs a decision (`@theme static` for the deprecated names is the spec's candidate fix).

- [ ] **Step 5: Run the full gate**

Run: `yarn check`
Expected: typecheck, all tests, build pass.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.ts src/styles/tokens.test.ts src/styles/theme-aliases.test.ts src/index.ts
git commit -m "Add shadcn role tokens aliased to their deprecated names"
```

---

### Task 2: Components read the new roles

**Files:**
- Modify: `src/styles/tokens.css` (field, button focus, rich text table/hr/blockquote, `--carousel-dot` default)
- Modify: `src/styles/field-css.test.ts`, `src/styles/button-css.test.ts`, `src/styles/richtext-css.test.ts`, `src/styles/carousel-css.test.ts`

**Interfaces:**
- Consumes: the Task 1 tokens.
- Produces: nothing new; component rules now read `--color-card`, `--color-input`, `--color-muted-foreground`, `--color-destructive`, `--color-ring`, `--color-border`.

- [ ] **Step 1: Update the tests to the new names**

`src/styles/field-css.test.ts` — in `'gives the control a visible surface from existing globals'`:

```ts
    expect(control).toContain('background: var(--color-card)')
    expect(control).toContain('border: 1px solid var(--color-input)')
```

in `'rings on focus-visible only, from the shared focus token'`:

```ts
    expect(ring).toContain('outline: 2px solid var(--color-ring)')
```

in `'colours the error text but never uses colour as the only cue'`:

```ts
    expect(ruleFor('.sankara-field-error')).toContain('color: var(--color-destructive)')
```

and add after that test:

```ts
  it('mutes the description with the secondary-text role', () => {
    expect(ruleFor('.sankara-field-description')).toContain(
      'color: var(--color-muted-foreground)'
    )
  })
```

`src/styles/button-css.test.ts` — in `'draws a focus ring from the token, not from currentColor'`:

```ts
    expect(focus).toContain('outline: 2px solid var(--color-ring)')
```

and add inside `'declares the focus token with a default'`:

```ts
    expect(css).toMatch(/--color-ring:\s*var\(--color-focus\)/)
```

`src/styles/richtext-css.test.ts` — in `'restores table borders, padding and header alignment'`:

```ts
    expect(cells).toContain('border: 1px solid var(--color-border)')
```

and in `'restores hr and gives blockquote a fallback'`, add:

```ts
    expect(ruleFor(':where(.sankara-richtext) hr')).toContain(
      'border-block-start: 1px solid var(--color-border)'
    )
    expect(ruleFor(':where(.sankara-richtext) blockquote')).toContain(
      'border-inline-start: 2px solid var(--color-border)'
    )
```

`src/styles/carousel-css.test.ts` — after `expect(theme).toContain('--carousel-dot:')` (line 62):

```ts
    expect(theme).toContain('--carousel-dot: var(--color-muted-foreground)')
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run src/styles/field-css.test.ts src/styles/button-css.test.ts src/styles/richtext-css.test.ts src/styles/carousel-css.test.ts`
Expected: FAIL on each changed expectation (the CSS still reads the old names).

- [ ] **Step 3: Implement in `src/styles/tokens.css`**

- `@theme`: `--carousel-dot: var(--color-muted);` → `--carousel-dot: var(--color-muted-foreground);`
- `.sankara-button:focus-visible`: `outline: 2px solid var(--color-focus);` → `var(--color-ring)`. Update the comment above it: "The token defaults to --color-primary" → "--color-ring defaults, through --color-focus, to --color-primary".
- `.sankara-field-control`: `background: var(--color-surface);` → `var(--color-card)`; `border: 1px solid var(--color-muted);` → `var(--color-input)`.
- The field `:focus-visible` rule: `var(--color-focus)` → `var(--color-ring)`.
- `.sankara-field-description`: `var(--color-muted)` → `var(--color-muted-foreground)`.
- `.sankara-field-error`: `var(--color-error)` → `var(--color-destructive)`.
- Rich text `:is(th, td)`, `hr`, `blockquote`: each `var(--color-muted)` → `var(--color-border)`.

Afterwards this must print nothing (no component rule reads a deprecated name; only the `@theme` defaults may mention them):

Run: `sed -n '/^}/,$p' src/styles/tokens.css | grep -nE 'var\(--color-(surface|on-surface|muted|focus|error|primary-contrast)\)'`
Expected: no output.

- [ ] **Step 4: Run to verify they pass**

Run: `yarn check`
Expected: PASS, including Task 1's `theme-aliases.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/*-css.test.ts
git commit -m "Read role tokens in component rules"
```

---

### Task 3: Stories use the new utilities

Stories are the package's living documentation; they should not teach deprecated names.

**Files:**
- Modify: `src/components/*.stories.tsx` (Button, Carousel, Dialog, Disclosure, and any other match)

**Interfaces:**
- Consumes: Task 1 utilities (`bg-card`, `text-card-foreground`, `text-primary-foreground`, `text-muted-foreground`, `border-border`).

- [ ] **Step 1: Replace the deprecated utilities**

```bash
perl -pi -e '
  s/(?<![\w-])bg-surface(?![\w-])/bg-card/g;
  s/(?<![\w-])text-on-surface(?![\w-])/text-card-foreground/g;
  s/(?<![\w-])text-primary-contrast(?![\w-])/text-primary-foreground/g;
  s/(?<![\w-])text-muted(?![\w-])/text-muted-foreground/g;
  s/(?<![\w-])border-muted(?![\w-])/border-border/g;
' src/components/*.stories.tsx
```

(`perl`, not `sed`: macOS `sed -E` silently ignores `\b`, and a hyphen is a word boundary, so `text-muted` must not match inside a longer class. Leave `Icon.test.tsx` and `Carousel.test.tsx` alone — their `text-muted`/`bg-muted` are arbitrary class strings under test, not styling.)

- [ ] **Step 2: Verify nothing deprecated remains and nothing was double-replaced**

Run: `grep -nE '\b(bg-surface|text-on-surface|text-primary-contrast|border-muted)\b|text-muted\b[^-]|muted-foreground-foreground' src/components/*.stories.tsx`
Expected: no output.

- [ ] **Step 3: Build Storybook**

Run: `yarn build-storybook --quiet`
Expected: build succeeds. Then `rm -rf storybook-static` if it is not gitignored (`git status --short` must show only the stories).

- [ ] **Step 4: Commit**

```bash
git add src/components/*.stories.tsx
git commit -m "Use role utilities in stories"
```

---

### Task 4: README, section-theming recipe and its coverage test

**Files:**
- Create: `src/styles/band-recipe.test.ts`
- Modify: `README.md` (Theming table at lines 46–76, Carousel "Dot colours" ~line 155, Button "Focus and styling" ~line 234, Popover example ~line 303, Forms ~line 522)
- Modify: `CLAUDE.md` (the "Token contract, three places in sync" bullet)

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 component reads.
- Produces: README `### Themed sections` subsection containing exactly one `@utility band-accent { … }` css block (the test parses it).

- [ ] **Step 1: Write the failing test**

Create `src/styles/band-recipe.test.ts`:

```ts
// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// The README's band recipe is the whole of section theming (spec D6), and it
// only works if it re-declares every colour a package rule reads: aliases
// resolve at :root, so anything left out keeps the page's colour inside the
// band. This cross-checks the documented recipe against the stylesheet.
const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const readme = fs.readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

// Deliberately not re-themed -- see the spec's D6.
const EXCLUDED = ['--color-destructive', '--color-backdrop']

const COLOUR_READ = /var\((--(?:color-[\w-]+|carousel-dot[\w-]*|field-accent))\)/g

describe('section theming recipe', () => {
  const recipe = readme.match(/@utility band-accent \{[\s\S]*?\n\}/)?.[0] ?? ''

  it('is documented in the README', () => {
    expect(recipe).not.toBe('')
  })

  it('re-declares every colour a package rule reads', () => {
    // Rules only: the @theme block is the defaults, not a read.
    const rules = css
      .slice(css.indexOf('}', css.indexOf('@theme')) + 1)
      .replace(/\/\*[\s\S]*?\*\//g, '')
    const reads = new Set([...rules.matchAll(COLOUR_READ)].map(m => m[1]))
    const declared = new Set([...recipe.matchAll(/^\s*(--[\w-]+):/gm)].map(m => m[1]))
    const missing = [...reads].filter(token => !declared.has(token) && !EXCLUDED.includes(token))
    expect(missing).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn vitest run src/styles/band-recipe.test.ts`
Expected: FAIL — `is documented in the README` (no recipe yet).

- [ ] **Step 3: Rewrite the README Theming section**

Replace the table under `## Theming` (README lines 51–76, the header row through the `--field-accent` row) with:

```markdown
| Token | Purpose |
| --- | --- |
| `--color-background` | Page ground; set by a themed section (see below) |
| `--color-foreground` | Body text on `--color-background` |
| `--color-primary` | Brand colour — links in rich text, active carousel dot, checkbox/radio accent |
| `--color-primary-foreground` | Text on `--color-primary` |
| `--color-card` | Card, panel and field-control background |
| `--color-card-foreground` | Text on `--color-card` |
| `--color-muted-foreground` | Secondary text — field descriptions, inactive carousel dots |
| `--color-border` | Hairlines — rich text tables, `hr`, blockquote |
| `--color-input` | Field-control border, defaults to `--color-border` |
| `--color-ring` | Focus ring on `Button` and fields |
| `--color-destructive` | Error message text |
| `--color-accent` | Accent band ground, defaults to `--color-primary` |
| `--color-accent-foreground` | Text on `--color-accent` |
| `--radius-card` | Corner radius for cards, panels and field controls |
| `--shadow-raised` | Elevation for raised surfaces |
| `--duration-expand` | Open/close duration for `Disclosure` and `Dialog` |
| `--color-backdrop` | `::backdrop` behind an open `Dialog` |
| `--richtext-flow` | Vertical rhythm between rich text blocks |
| `--richtext-measure` | Line length when `RichText` applies the measure |
| `--richtext-h1` | `h1` size inside rich text, fluid |
| `--richtext-h2` | `h2` size inside rich text, fluid |
| `--richtext-h3` | `h3` size inside rich text, fluid |
| `--richtext-h4` | `h4` size inside rich text, fluid |
| `--heading-1` | `Heading` `.h1` size, fluid — page headings, not rich text |
| `--heading-2` | `Heading` `.h2` size, fluid |
| `--heading-3` | `Heading` `.h3` size, fluid |
| `--heading-4` | `Heading` `.h4` size, fluid |
| `--carousel-dot` | Inactive `Carousel` dot, defaults to `--color-muted-foreground` |
| `--carousel-dot-active` | Active `Carousel` dot, defaults to `--color-primary` |
| `--field-accent` | Native checkbox and radio accent colour, defaults to `--color-primary` |

The colour roles use [shadcn/ui](https://ui.shadcn.com/docs/theming)'s names.
Two of shadcn's are absent on purpose: `--color-muted` still means secondary
*text* here until 1.0 (below), and there is no shared `--radius`, because
deriving one would redefine Tailwind's own `rounded-*` scale in every consumer.
Fonts are yours: no component sets a family.

### Deprecated names (removed in 1.0)

Each still works: its replacement defaults to `var(<old name>)`, so an override
of the old name keeps driving the component, and the old utilities
(`text-muted`, `bg-surface`, …) keep generating. Rename at your own pace.

| Deprecated | Use instead |
| --- | --- |
| `--color-primary-contrast` | `--color-primary-foreground` |
| `--color-surface` | `--color-card` |
| `--color-on-surface` | `--color-card-foreground` |
| `--color-muted` | `--color-muted-foreground` |
| `--color-focus` | `--color-ring` |
| `--color-error` | `--color-destructive` |

If your own theme already uses one of the new names with another meaning —
say `--color-input` as a field *background* — yours wins, and the package will
use it as the field border. Rename yours before adopting `Field`.

### Themed sections

Custom properties inherit, so a section re-themes the components inside it by
re-declaring the roles they read on its root element. Declare **all** of them:
the defaults above resolve once, at `:root`, so a role you leave out keeps the
page's value inside the band — and overriding a deprecated name on an element
does not reach its replacement at all.

```css
@utility band-accent {
  --color-background: var(--color-accent);
  --color-foreground: var(--color-accent-foreground);
  --color-primary: var(--color-accent-foreground);
  --color-border: color-mix(in oklch, var(--color-accent-foreground) 30%, transparent);
  --color-input: var(--color-border);
  --color-ring: var(--color-accent-foreground);
  --color-card: var(--color-accent);
  --color-card-foreground: var(--color-accent-foreground);
  --color-muted-foreground: color-mix(in oklch, var(--color-accent-foreground) 70%, transparent);
  --carousel-dot: var(--color-muted-foreground);
  --carousel-dot-active: var(--color-accent-foreground);
  --field-accent: var(--color-accent-foreground);
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

`--color-destructive` stays: an error is still red on a band. `--color-backdrop`
stays: a dialog's backdrop sits in the top layer, outside any section.
```

- [ ] **Step 4: Update the remaining README mentions**

- Carousel "Dot colours" (~line 155): after the existing paragraph add: "Inside a themed section (see Theming) the recipe already sets both."
- Button "Focus and styling" (~line 234): replace "The focus ring is `outline: 2px solid var(--color-focus)`, offset from the control, and appears for keyboard users only. Override `--color-focus` in your own `@theme`; it defaults to `--color-primary`." with "The focus ring is `outline: 2px solid var(--color-ring)`, offset from the control, and appears for keyboard users only. Override `--color-ring` in your own `@theme`; it defaults to `--color-primary`."
- Popover example (~line 303): `bg-surface p-2 text-on-surface` → `bg-card p-2 text-card-foreground`.
- Forms (~line 522): "default uses `--color-surface`, `--color-muted` and `--radius-card`" → "default uses `--color-card`, `--color-input` and `--radius-card`".

Run: `grep -nE 'color-(surface|on-surface|muted|focus|error|primary-contrast)\b|bg-surface|text-on-surface' README.md`
Expected: matches only inside the "Deprecated names" section and its paragraph.

- [ ] **Step 5: Update CLAUDE.md**

Replace the "Token contract, three places in sync" bullet's first two lines with:

```markdown
- **Token contract, four places in sync:** `src/styles/tokens.ts` (`TOKENS`
  array and the `DEPRECATED_TOKENS` old → new map), `src/styles/tokens.css`
  (`@theme` defaults), the README table, and the README's `band-accent` recipe.
  `tokens.test.ts` fails if a `TOKENS` entry has no CSS default or a replacement
  does not default to `var(<old>)`; `band-recipe.test.ts` fails if a component
  reads a colour the recipe does not re-declare.
```

(keep the bullet's remaining sentences about styling through tokens).

- [ ] **Step 6: Run to verify**

Run: `yarn check`
Expected: PASS, including `band-recipe.test.ts`. If `re-declares every colour a package rule reads` lists a token, either the recipe or `EXCLUDED` is wrong — add it to the recipe unless the spec's D6 excludes it.

- [ ] **Step 7: Commit**

```bash
git add README.md CLAUDE.md src/styles/band-recipe.test.ts
git commit -m "Document role tokens, deprecations and the section recipe"
```

---

### Task 5: Changeset and PR

**Files:**
- Create: `.changeset/token-contract-role-names.md`

- [ ] **Step 1: Write the changeset**

```markdown
---
'@sankara-ui/core': minor
---

Colour tokens take shadcn/ui's role names. New: `--color-background`,
`--color-foreground`, `--color-primary-foreground`, `--color-card`,
`--color-card-foreground`, `--color-muted-foreground`, `--color-border`,
`--color-input`, `--color-ring`, `--color-destructive`, `--color-accent`,
`--color-accent-foreground`. Component rules read the new names.

Deprecated, removed in 1.0 — each replacement defaults to `var(<old>)`:
`--color-primary-contrast` → `--color-primary-foreground`, `--color-surface` →
`--color-card`, `--color-on-surface` → `--color-card-foreground`,
`--color-muted` → `--color-muted-foreground`, `--color-focus` → `--color-ring`,
`--color-error` → `--color-destructive`.

Package component defaults are visually unchanged, and an override of a
deprecated name keeps driving its replacement. Two things can still change on
upgrade: the new names generate new utilities (`bg-card`, `border-border`, …),
so a class of that name already in your markup starts applying; and a theme
that already defines one of the new names with another meaning wins over the
package — djalicunda.com's `--color-input` (a field background) would become the
`Field` border. The README's "Themed sections" recipe re-colours every
component inside a band.
```

- [ ] **Step 2: Verify the changeset parses**

Run: `yarn changeset status`
Expected: `@sankara-ui/core` listed with a **minor** bump (0.9.0 → 0.10.0; the pending patch changeset folds into it).

- [ ] **Step 3: Commit**

```bash
git add .changeset/token-contract-role-names.md
git commit -m "Add changeset for the role-token contract"
```

- [ ] **Step 4: Ask before pushing**

Ask the user before pushing `feat/token-contract` and opening a PR against `main`. PR description: what was decided (spec D1–D6), what was rejected and why (extend `on-x`; shadcn `muted` now; shared `--radius`; package theme classes), plus the Codex review outcome. End with the Claude Code attribution line.

Publishing 0.10.0 happens through the existing release workflow (merge the PR, then the "Version Packages" PR). Both merges are the user's call.

---

### Task 6: Template starter theme (next-storyblok-template)

**Gate:** only after `npm view @sankara-ui/core version` prints `0.10.0`. Work in `/Users/m43nu/Projects/sahli-interactive/next-storyblok-template` on a new branch from `main`: `git switch -c feat/starter-theme origin/main`.

**Files:**
- Modify: `package.json` (`@sankara-ui/core` range), `yarn.lock`
- Modify: `styles/globals.css` (the `@theme` block, lines 9–14, and `@layer base`)

**Interfaces:**
- Consumes: `@sankara-ui/core@^0.10.0` role tokens; the README `band-accent` recipe (copied verbatim).

- [ ] **Step 1: Bump the package**

Run: `yarn add @sankara-ui/core@^0.10.0`
Expected: `package.json` shows `"@sankara-ui/core": "^0.10.0"`.

- [ ] **Step 2: Replace the `@theme` block in `styles/globals.css`**

Replace lines 9–14 (`@theme { … --color-primary: #09b3af; }`) with:

```css
/* Starter theme. Rebranding a site = editing the palette and the two fonts;
   the roles below map the palette onto @sankara-ui/core's contract (its
   README, "Theming"). Components read roles, never the palette. */
@theme {
  /* Palette -- the brand's own names. */
  --color-brand: #09b3af;
  --color-ink: #1f2933;
  --color-paper: #ffffff;
  --color-stone: #6b7280;
  --color-line: #e5e7eb;
  --color-alert: #b42318;

  /* Keep the generic family unquoted so it remains a fallback keyword. */
  --font-sans: Roboto, sans-serif;
  --font-display: Roboto, sans-serif;

  /* Roles. Ink, not paper, on brand: white on #09b3af is ~2.6:1 and fails
     WCAG AA for text. */
  --color-background: var(--color-paper);
  --color-foreground: var(--color-ink);
  --color-primary: var(--color-brand);
  --color-primary-foreground: var(--color-ink);
  --color-card: var(--color-paper);
  --color-card-foreground: var(--color-ink);
  --color-muted-foreground: var(--color-stone);
  --color-border: var(--color-line);
  --color-input: var(--color-line);
  --color-ring: var(--color-brand);
  --color-destructive: var(--color-alert);
  --color-accent: var(--color-brand);
  --color-accent-foreground: var(--color-ink);
}
```

After the `@utility container { … }` block, add the recipe verbatim from the package README's "Themed sections" (the `@utility band-accent { … }` block).

At the top of `@layer base { … }`, add:

```css
  body {
    @apply bg-background text-foreground;
  }
```

- [ ] **Step 3: Verify**

Run: `yarn check && yarn build && git checkout -- next-env.d.ts`
Expected: formatting, ESLint, TypeScript, tests, type drift and the production build pass.

Run: `grep -o 'band-accent' .next/static/css/*.css | head -1; grep -c -- '--color-muted-foreground' .next/static/css/*.css`
Expected: `band-accent` appears only if a component uses it (no component does yet — no output is correct); `--color-muted-foreground` is emitted (non-zero), proving the package reads resolved through the new build.

- [ ] **Step 4: Contrast check**

Run: `node -e "const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};const r=(a,b)=>{const[x,y]=[L(a),L(b)].sort((m,n)=>n-m);return((x+.05)/(y+.05)).toFixed(2)};console.log('ink/brand',r('#1f2933','#09b3af'),'paper/brand',r('#ffffff','#09b3af'),'stone/paper',r('#6b7280','#ffffff'))"`
Expected: `ink/brand` ≥ 4.5, `paper/brand` < 4.5 (confirms the comment), `stone/paper` ≥ 4.5.

- [ ] **Step 5: Look at it**

Run `yarn dev` and open a page with a rich text table and a form (or the home page): body text is ink on paper, links teal, focus ring teal, field borders light grey. Report what was checked.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock styles/globals.css
git commit -m "Adopt sankara-ui 0.10 role tokens as a starter theme"
```

Ask the user before pushing and opening the PR.
