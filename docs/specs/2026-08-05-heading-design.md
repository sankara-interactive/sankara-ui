# `Heading` — Design

Date: 2026-08-05
Status: draft; pending implementation
Scope: Tier 3 of `next-storyblok-template/docs/enhancement-roadmap.md`, second half
of the typography work — `RichText` is `docs/specs/2026-08-04-richtext-design.md`

## Problem

An `<h2>` that must look like an `h1` is not an edge case in this estate — it is
the normal way pages are built. A card's title is an `h3` in the document
outline and an `h4` on screen; a section heading inside a `<section>` is an `h2`
that has to read as small as an `h4`. The semantic level answers to the outline
and to screen readers; the visual level answers to the layout.

Every project surveyed solved this, independently, with the same trick: define
the appearance under a class as well as the tag, then write the tag and the
class separately at the call site. Nobody named the pattern, so nobody typechecks
it, and 54 call sites across five projects spell the mismatch out by hand.

## Evidence base

Five projects, five implementations of the same idea.

| Project | Mechanism | Where |
| --- | --- | --- |
| brillen-werk.ch | `h1, .h1 { @apply … }` in `@layer base` | `styles/globals.css:33` |
| fgpfister.ch | same, plus `:is(h1, h2, h3, .h1, .h2, .h3)` for the hyphen policy | `styles/globals.css:142`, `:171` |
| fairmed.ch-sb | same, all six levels | `styles/typography.scss:2` |
| nuwa.swiss | same, `h1`/`h2`/`h3`/`h6` only | `styles/base/typography.scss:2` |
| numbers.ch | `.h1`–`.h3` classes **and no bare-tag rule at all**, plus `@utility text-h1`–`text-h4` | `styles/globals.css:97`, `:38` |

Six findings:

1. **All five make the appearance reachable by class.** Four write the `hN, .hN` twin
   verbatim; numbers.ch writes the class half only. No project styles the tag
   alone.

2. **Two thirds of heading call sites carry a level the tag does not.** 98 sites
   across the five projects put a heading class on an element, counted by tag
   *and* class together — an earlier count of 101 was by class alone, which
   proves only that the classes occur, not that the two levels differ:

   | Pair | Count |
   | --- | --- |
   | mismatched — `h3`+`.h4` 29, `h2`+`.h4` 15, `h2`+`.h3` 6, `h3`+`.h5` 2, `h3`+`.h6` 1, `h2`+`.h1` 1 | **54** |
   | matched — `h2`+`.h2` 23, `h3`+`.h3` 4, `h1`+`.h1` 2 | **29** |
   | non-heading element — `div` 8, `p` 5, `span` 2 | **15** |

   54 of the 83 sites on an actual heading element are the split in action, and
   one shape accounts for more than half of those — a card title demoted
   visually, kept correct in the outline:

   ```tsx
   <h3 className="h4 group-hover:text-brown transition duration-300">{blok.headline}</h3>
   ```

   (`brillen-werk.ch/components/nestables/Card.tsx:23`)

   The 29 matched sites are not surplus: D3 emits the class there too, which is
   exactly what numbers.ch requires (finding 4). The 15 non-heading sites are
   finding 6, and D5 excludes them.

3. **The values agree on nothing.** Font weight spans `font-normal` (fgpfister,
   whose comment records that Serifa ships a single face and sets the weight
   explicitly so the browser does not synthesise bold) to `800` (numbers,
   brillen `font-extrabold`). Family is per-brand
   (`font-display`, `font-serif`, `font-heading`). Margin runs from `margin: 0`
   (numbers, explicitly) to `mb-12` (fairmed). Only size and line-height have a
   meaningful centre — see Tokens.

4. **numbers.ch is the reason the class is never optional.** It defines `.h1`,
   `.h2`, `.h3` and no `h1`/`h2`/`h3` rule, so preflight's `font-size: inherit`
   stands and a bare `<h1>` renders as body copy. There, `<h1 class="h1">` is the
   only markup that produces a heading.

5. **Editor-controlled levels exist, barely.** One site reads the level from the
   CMS — `const HeadlineTag = blok.level || 'h2'`
   (`fairmed.ch-sb/components/nestables/TextBlock.tsx:6`) — plus two conditional
   tag switches (`LandingHeader.tsx:23`, `CardLarge.tsx:24`). Real, but thin: the
   component is not justified by this case alone.

6. **Non-headings wear heading classes, and correctly so.** fairmed puts `.h2`
   and `.h3` on `<div>`s for an impact figure, a CHF total and a legend number
   (`ImpactSlider.tsx:42,81`, `LegendItem.tsx:17`, `TransparencyItem.tsx:25`).
   Those are display type, not outline entries. D5 keeps them out.

## Decisions

### D1 — The component owns the split; the project owns everything but scale

`Button` ships no colours or padding because a consumer authors every button.
`RichText` does ship sizes because nobody authors CMS output and preflight has
stripped it. Page headings sit between the two: every one is authored, so the
mechanism is the point — but preflight strips their size and weight just as
thoroughly, and a package that emits `class="h4"` and defines nothing has
shipped a hook, not a component.

So the split is exact, and stating it loosely as "the project owns the look"
would contradict D4:

- **The package ships:** the tag/class mechanism, and `font-size` +
  `line-height` for `.h1`–`.h4`.
- **The project owns:** weight, family, colour, margin, letter-spacing,
  balance, hyphenation — every column where the estate disagrees (finding 3,
  D5) — plus the freedom to override the two the package does ship, which D4's
  cascade table is built to guarantee.

```tsx
<Heading level={3} visual={4}>Title</Heading>
// → <h3 class="h4">Title</h3>
```

The type system carries the constraint that a `className` string cannot: `level`
and `visual` are `1 | 2 | 3 | 4 | 5 | 6`, so `visual={7}` and `level="h3"` are
compile errors, and `level` is required — the outline decision is never
implicit. That guarantee is compile-time only; see the API section on what
reaches the DOM from an untyped caller.

**Recorded honestly:** over `<h3 className="h4">` this saves keystrokes nowhere.
Its value is that the two levels become two named, typed arguments instead of
one string where a typo is silent, plus the one dynamic-level site (finding 5)
that currently hand-rolls a tag switch. That is a modest case, and it is the
whole case.

### D2 — The emitted class is `h1`–`h6`, unnamespaced

Every other class in this package is namespaced (`sankara-button`,
`sankara-richtext`, `sankara-popover`). This one is not, and the reason is
finding 1: the `.hN` convention is already established in all five projects,
though only fairmed defines all six levels — brillen-werk has `.h1`/`.h2`/`.h4`,
nuwa `.h1`/`.h2`/`.h3`/`.h6`, numbers `.h1`–`.h3`. Emitting
`sankara-h4` would mean every consumer adds six aliases before the component
renders as anything, while the estate's real convention carries on beside it.

The cost is that the package emits a class name it does not own. A consumer
whose `.h4` means something unrelated collides, silently. This is stated in
Risks rather than defended.

### D3 — The class is emitted even when `visual === level`

`visual` defaults to `level`, so `<Heading level={2}>` renders
`<h2 class="h2">`. In the four twin-rule projects that duplicate is inert. In
numbers.ch it is the only thing that renders a heading at all (finding 4). One
behaviour covers both, and no consumer has to know which kind of project they
are in.

### D4 — Base styles ship on the class only, never the bare tag

Four of five projects write `h1, .h1 { … }`, and the package deliberately does
not. Styling the bare tag would mean installing this package restyles every
heading on a consumer's site, authored or not — the "silently restyle every
consumer site" shape that `RichText`'s stylesheet test exists to catch.

So the package styles what it emits and nothing else:

```css
@layer base {
  .h1 { font-size: var(--heading-1); line-height: 1.1 }
  .h2 { font-size: var(--heading-2); line-height: 1.15 }
  .h3 { font-size: var(--heading-3); line-height: 1.2 }
  .h4 { font-size: var(--heading-4); line-height: 1.3 }
}
```

A hand-written `<h1>` with no class is untouched. Every `<Heading>` whose
`visual` is 1–4 gets a default; `visual={5}` and `visual={6}` emit their class
and get nothing, by D6.

**Cascade, derived from `tailwindcss@4.3.3` in this repo's `node_modules`.**
Verified from source, not from memory: `index.css:1` declares
`@layer theme, base, components, utilities`; inside `@layer base`, preflight
declares `html, :host { line-height: 1.5 }` and

```css
h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit }
```

at specificity `(0,0,1)` (`preflight.css:78–86`).

The table below covers **normal (non-`!important`) author declarations under
Tailwind's default layer order**. It is not a general account of the cascade:
`!important`, inline styles, active transitions and `@scope` proximity all
outrank or reorder what follows, and a consumer who redeclares `@layer` order
or emits utilities into a custom layer changes the premises. None of those
appear anywhere in the estate, and the package ships no `!important`.

| Competing rule | Specificity | Outcome | Why |
| --- | --- | --- | --- |
| Preflight's `h1…h6` reset | `(0,0,1)`, `@layer base` | **ours wins** | `(0,1,0)` beats `(0,0,1)` in the same layer, on specificity alone — no source-order dependency |
| A consumer's `h1, .h1 { … }` twin in `@layer base` | `(0,1,0)` on the class half | **theirs wins**, conditionally | ties ours; resolved by source order, so it depends on their stylesheet importing after ours — the README's install order |
| A consumer's **unlayered** `.h1` or `h1` rule | any | **theirs wins** | unlayered author rules beat every layered one regardless of specificity or order |
| A consumer's rule in `@layer components` / `utilities` | any | **theirs wins** | later layer beats earlier |
| Any Tailwind utility (`text-xs`) | `@layer utilities` | **utility wins** | later layer beats earlier, regardless of specificity |
| A consumer's **bare-tag-only** `h1 { … }` | `(0,0,1)`, `@layer base` | **ours wins** | and it should not — see Risks |

Rows three and four are worth stating because they are the common shapes: a
project that has not adopted Tailwind's layers at all, or styles headings in
`components`, overrides the package unconditionally. Only row two carries the
install-order dependency, and only row six is a defect.

Against preflight specifically this is a strictly better position than
`RichText`'s D3, which needed source order for its defaults to apply at all:
here specificity decides, so no ordering of *this stylesheet against Tailwind's*
can leave a `<Heading>` unstyled. That is the whole of what the first row
proves — it says nothing about a consumer omitting the package stylesheet,
overriding `--heading-N` with an invalid value, or customising layer order,
each of which can still leave `font-size: var(--heading-1)` without effect.

**Line-height is not optional.** Preflight resets no heading line-height, so a
56px `h1` inherits `html`'s `1.5` and renders on 84px leading. The size cannot
ship without it.

The line-heights are literals, not tokens. A consumer overriding
`--heading-1` keeps ours, which is unitless and therefore still proportional; a
consumer who wants a different one writes their own `.h1` rule and wins by D4's
table. Four tokens is the smaller surface.

Note this is the second place the package puts rules in `@layer base` rather
than `@layer components`, after `RichText`. Same justification — these are
defaults meant to be stepped over. `tokens.test.ts`'s layer invariant does not
currently *reject* this block; it does not see it at all, since its per-block
cases match on selector substrings and `.h1` matches none of them. Testing says
what has to be added.

### D5 — Size and line-height only

Nothing else ships. Not weight, family, colour, margin, `text-balance` or
`hyphens`.

Finding 3 is the whole argument: those are the columns where the estate
disagrees, and a package default in a disputed column is something consumers
fight rather than build on. Weight in particular has no centre to take — a `700`
default would be actively wrong for fgpfister, whose display face has no bold
and would be synthesised by the browser.

**The consequence, stated:** preflight sets `font-weight: inherit` on headings,
so a `<Heading>` in a project with no weight rule renders bold-less, at body
weight. That is nuwa.swiss's shipped state today (`typography.scss` sets family
and size, never weight), so it is a look that has passed review in this estate
rather than a hypothetical. It is still the most likely first complaint, and the
README says in one line what to add.

**No `as` prop.** Finding 6 shows five real sites where a `<div>` correctly
wears a heading class. An `as="div"` escape hatch on a component called
`Heading` invites putting a `div` in the document outline, which is the one
mistake this component exists to prevent. Those sites keep writing
`<div className="h3">`.

### D6 — No `.h5`/`.h6` rule

The classes are emitted — `visual={5}` gives `class="h5"` — but the package
ships no declarations for them.

Only fairmed sizes `h5`/`h6` (`18px`/`16px`), and at `16px` with no weight a
`.h6` rule would be indistinguishable from the body copy beside it: a rule that
does nothing, plus two tokens to maintain. `RichText` made the same cut for the
same reason, sizing `h1`–`h4` and leaving `h5`/`h6` to weight alone.

So `.h5` and `.h6` are bare hooks — the mechanism without a default.

**This makes `visual` non-uniform, and the API must say so.** `visual={4}` gets
a package size; `visual={5}` gets a class and nothing else, and renders as body
copy until the consumer defines `.h5`. The type accepts all six, because the
mechanism genuinely spans all six and the estate uses `.h5`/`.h6` (2 sites);
the doc comment on `visual` and the README table both name 1–4 as the range the
package supplies defaults for. Narrowing the type to `1 | 2 | 3 | 4` would break
the two real `h3`+`.h5`/`.h6` call sites for a distinction better made in
documentation.

## API

```ts
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = Omit<ComponentPropsWithRef<'h1'>, 'children'> & {
  children: ReactNode
  /** Semantic level — the document outline. Renders <h1>…<h6>. */
  level: HeadingLevel
  /** Visual level — emits `h1`…`h6`. Defaults to `level`. The package ships
      size defaults for 1–4 only; 5 and 6 are hooks for your own CSS (D6). */
  visual?: HeadingLevel
}
```

```tsx
export function Heading({ level, visual = level, className, children, ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return (
    <Tag className={cn(`h${visual}`, className)} {...props}>
      {children}
    </Tag>
  )
}
```

- `level` is required; `visual` defaults to it (D3).
- `className` merges after the component's own, so a consumer's utility wins by
  Tailwind's own layer order regardless.
- `ref` and every other prop reach the element — under React 19 `ref` is an
  ordinary prop, as in `Disclosure` and `RichText`, which is why the props type
  is `ComponentPropsWithRef` rather than `WithoutRef`.
- `ComponentPropsWithRef<'h1'>` is not an `h1`-specific choice: all six heading
  tags share `HTMLHeadingElement`.
- A server component. No hooks, no handlers, no `'use client'`.

**Two limits of the typed guarantee, documented rather than engineered around.**

*Untyped callers.* This is a published package, so `level={7}` from JavaScript
renders `<h7>` — React passes unknown tags through, producing invalid HTML
rather than throwing. No runtime guard ships: the only CMS-driven level in the
estate is `level?: "h2" | "h3" | "h4" | "h5"`
(`fairmed.ch-sb/types/component-types-sb.d.ts:1305`), a Storyblok option field
with fixed values, so the trust boundary is already closed upstream. A silent
clamp would hide the caller's bug and a throw would blank a page over a
heading; neither is better than the type error the TypeScript caller already
gets. That same field yields **strings** (`"h3"`), not numbers, so a consumer
wiring it to `level` must map it — the README shows the one-liner.

*A heading class via `className`.* `<Heading level={2} visual={4}
className="h1">` emits `class="h4 h1"`. `cn` is a plain join
(`src/utilities/cn.ts`), and class-attribute order never decides the cascade —
whichever rule is later in the stylesheet wins, so within the package's own
block `.h4` beats `.h1`, while a consumer's own later `.h1` would not. `visual`
is authoritative only when no competing heading class is passed. This is a
consumer writing two visual levels at once; it is documented, not prevented.
- Exported from `src/index.ts`. No optional peer, so nothing about `Icon`'s
  separate export path applies.

## Tokens

Four added, each in `TOKENS`, the `@theme` block and the README table:

| Token | Default | Estate median |
| --- | --- | --- |
| `--heading-1` | `clamp(2.25rem, 1.73rem + 2.21vw, 3.5rem)` | 36→56px |
| `--heading-2` | `clamp(1.875rem, 1.72rem + 0.66vw, 2.25rem)` | 30→36px |
| `--heading-3` | `clamp(1.25rem, 0.99rem + 1.1vw, 1.875rem)` | 21→30px, rounded to 20→30 |
| `--heading-4` | `clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)` | 19→20px, rounded to 18→20 |

**These are derived, not invented** — the one place this spec is on firmer
ground than `RichText`'s, whose clamps it admits were "chosen to be reasonable
rather than derived". Each endpoint is the median of the five projects' declared
sizes at their mobile and desktop ends:

| | brillen | fgpfister | fairmed | nuwa | numbers | median |
| --- | --- | --- | --- | --- | --- | --- |
| h1 | 48→72 | 48→72 | 36→48 | 30→36 | 36→56 | 36→56 |
| h2 | 30→36 | 30→48 | 30→36 | 20→24 | 28→36 | 30→36 |
| h3 | — | 20→30 | 24→30 | 18→20 | 22→32 | 21→30 |
| h4 | 20 | 18→24 | 20 | — | 18→20 | 19→20 |

px. Tailwind's scale where projects used it (`text-3xl` 30, `text-4xl` 36,
`text-5xl` 48, `text-7xl` 72). Three caveats on the table itself. brillen-werk
sets `html { font-size: 18px }` at `md`, so its desktop figures are really 12.5%
larger (`text-7xl` → 81px). It also defines no `h3` at all, so the `h3` row is a
median of four. And two rows are rounded to land on a round `rem`: `h3` from
21px to `1.25rem` (20px) and `h4` from 19px to `1.125rem` (18px) at the mobile
end — in both cases the median falls between two adjacent Tailwind steps because
an even number of projects contribute, and the lower step is taken.

The clamps interpolate linearly between 375px and 1280px viewports, targeting
those endpoints — but they do not hit them exactly, and the spec should not
claim otherwise. Computed at a 16px root:

| Token | at 375px | at 1280px | ceiling actually engages |
| --- | --- | --- | --- |
| `--heading-1` | 36px (floor) | 55.97px | 1281px |
| `--heading-2` | 30px (floor) | 35.97px | 1285px |
| `--heading-3` | 20px (floor) | 29.92px | 1287px |
| `--heading-4` | 18px (floor) | 19.94px | 1309px |

The mobile ends are exact only because each preferred value falls a hair below
the floor and clamps to it. The desktop ends are 0.03–0.08px short, and the
ceilings engage 1–29px later than 1280px — `--heading-4`'s slope is shallow
enough (`0.22vw`) that rounding the coefficient to two decimals moves its
crossover noticeably. All of it is sub-pixel at the endpoints and invisible in
practice; the coefficients stay two-decimal for legibility rather than being
padded to chase an exactness that medians-of-medians do not warrant.

**The endpoints assume a 16px root.** The floors and ceilings are `rem` while
the interpolation is `vw`, so a project that changes the root font size shifts
every crossover — brillen-werk sets `html { font-size: 18px }` at `md`, which
is precisely such a project. The px figures above describe the package's
defaults in a default-root consumer, not a universal.

The estate's own mechanism is
a `md:` breakpoint step rather than a clamp; clamps are used here because
`RichText` already established them as this package's idiom, and a step would
need a breakpoint value the package would have to invent.

The median h1 lands within a rounding error of numbers.ch's shipped
`clamp(36px, 4.4vw, 56px)`, which is a useful check that the median is not an
artifact of averaging incompatible scales.

No new colour tokens. No weight, family, margin or spacing tokens — D5.

## Testing

Unusually ordinary for this package: no cascade claim lives in the component, so
its *rendered output* is fully checkable in jsdom. The feature as a whole is
not — every claim in D4 needs the browser pass below, and jsdom can validate
none of it.

Component tests:

- Each `level` 1–6 renders its matching tag.
- `visual` controls the class; it defaults to `level` (D3), and the class is
  present in the default case too — the numbers.ch guarantee.
- `level={3} visual={4}` renders `<h3 class="h4">` — the estate's dominant shape.
- `className` merges rather than replaces.
- `ref` and rest props reach the element.

Each assertion proven by mutation.

Stylesheet contract test, in the shape of `src/styles/richtext-css.test.ts`:

- `.h1`–`.h4` each set their `--heading-N` token and a line-height.
- The block sits inside `@layer base` (D4). `tokens.test.ts`'s `cascade
  layering` suite needs a **new case** for it, not merely a relaxed one: its
  existing checks match by selector substring — `sankara-richtext` must be in
  `base`, `sankara-(button|dialog|disclosure|popover)` must be in `components` —
  and `.h1` matches neither, so today only the blanket "ships no rule outside a
  layer" case would see it. Without a case naming the heading selectors, this
  block could drift into `components` and no test would fail.
- **No selector in the block targets a bare tag.** `h1 { }` or `h1, .h1 { }`
  appearing here would restyle every consumer's site, which is precisely what D4
  refuses. `tokens.test.ts`'s `layerOf` scanner already collects every prelude
  by scanning for `{` rather than matching an expected first character —
  written for this exact hazard, per its own comment ("a bare `h2 { }` escaping
  into this file is exactly the rule that must not ship unlayered") — so the
  check reuses it rather than writing a second parser. Proven by inserting a
  bare `h1 { }` and watching it fail.
- No `.h5`/`.h6` rule exists (D6).
- No `font-weight`, `font-family`, `color` or `margin` declaration appears in
  the block (D5) — the invariant that keeps the disputed columns out.
- The four tokens are declared **inside the `@theme` block**, asserted
  structurally. `tokens.test.ts` does not currently prove this for any token:
  it checks that each `TOKENS` entry appears somewhere in the file followed by
  a colon, and separately that *some* `@theme {` exists, so a token moved
  outside `@theme` passes both. A token outside `@theme` is not a Tailwind
  theme variable and cannot be overridden by a consumer's own `@theme` — the
  override path D4's whole design rests on. The `layerOf` scanner already
  tracks which block a declaration sits in, so the check is available cheaply.

## Browser verification

Much lighter than `RichText`'s, because only D4's table is a cascade claim and
three of its four rows follow from specificity alone. Still a **compiled
Tailwind fixture**, not the raw stylesheet — the layer order only exists after
Tailwind emits it, and this package has twice found defects that were invisible
any other way.

Confirm, in one fixture:

- A bare project — no consumer CSS at all — renders `<h2 class="h2">` at the
  clamp, not at preflight's inherited `16px`. This is the row `RichText`'s first
  round got wrong, and the one that matters most.
- A consumer's `@layer base { h2, .h2 { font-size: 3rem } }` twin beats ours.
- A `text-xs` utility beats both.
- A consumer's **bare-tag-only** `@layer base { h2 { font-size: 3rem } }` loses
  to ours — confirming the Risks entry is real rather than theoretical, and
  measuring it rather than reasoning about it.
- A hand-written `<h1>` carrying no class is unaffected by the package (D4).
- The clamp moves between a narrow and a wide viewport, not merely resolving to
  some value. Per the `RichText` round-2 note, `resize_window` did not move
  `window.innerWidth` in the automated tab across two sessions; a same-origin
  `<iframe>` of a set width is the technique that worked, since `vw` resolves
  against an iframe's own initial containing block.
- Line-height on an `h1` computes from the `.h1` rule, not `1.5` inherited from
  `html`.

Two process notes carried over from `RichText`, where they were learned
expensively:

- The automated tab reports `visibilityState: "hidden"`, so
  `requestAnimationFrame` never fires. Force layout with
  `document.body.offsetHeight` and read synchronously.
- **Every claim in the write-up must trace to a reading that was actually
  taken.** `RichText`'s verification section needed a 53-claim audit because
  measurements were attributed to runs that never produced them. Each row above
  records which fixture and which viewport produced it, or says it was not
  measured.

Single-engine results are to be recorded as single-engine.

## Verification

Executed 2026-08-05. **Single engine: Chrome 150.0.7871.115** on macOS (Darwin
25.5.0). Results are recorded as single-engine.

### Fixture

A consumer-shaped project built in the session scratchpad, never in the repo.
`tokens.css` is a byte-identical copy of `src/styles/tokens.css`
(md5 `45df468257fee4ee18fd8938d4755d3a`, verified against the source). Compiled
with `@tailwindcss/cli@4.3.3` — the same version the D4 table was derived from —
and served over `http://127.0.0.1` so the iframes below are same-origin.

Six entry stylesheets, each following the README's install order
(`@import "tailwindcss"` → `@import "./tokens.css"` → consumer CSS), compiled to
its own `out-*.css` and linked from its own `fixture-*.html`. All six share one
markup file:

```html
<p id="body">                     <h2 class="h2" id="bare">
<h3 class="h4" id="demoted">      <h1 id="untouched">
<h2 class="h2 text-xs" id="utility">  <h5 class="h5" id="hook">
<h1 class="h1" id="clamp1">       <h3 class="h3" id="three">
```

| Fixture | Consumer rule appended after `tokens.css` |
| --- | --- |
| `fixture-bare` | none |
| `fixture-twin` | `@layer base { h2, .h2 { font-size: 3rem } }` |
| `fixture-twin-before` | the same twin, imported **before** `tokens.css` |
| `fixture-unlayered` | `.h2 { font-size: 3rem }`, unlayered |
| `fixture-components` | `@layer components { .h2 { font-size: 3rem } }` |
| `fixture-baretag` | `@layer base { h2 { font-size: 3rem } }` |

The compiled output confirms the premise the whole table rests on: line 3 of
every `out-*.css` is `@layer theme, base, components, utilities`, and the
package's `.h1`–`.h4` land inside an `@layer base` block. Worth noting that
Tailwind emits the physical `@layer utilities` block *before* `@layer
components`; only the line-3 declaration decides order, which is exactly why
reading the raw stylesheet settles nothing.

Every reading below was taken by forcing layout with `document.body.offsetHeight`
and calling `getComputedStyle` synchronously. `requestAnimationFrame` was never
awaited — the automated tab reported `document.visibilityState === "hidden"`
throughout, confirming the carried-over process note.

### The bare project

`fixture-bare.html`, loaded top-level at **viewport 1720×1289**, root font-size
16px. At that width every clamp is at its ceiling.

| Element | `font-size` | `line-height` | `font-weight` |
| --- | --- | --- | --- |
| `#body` `p` | 16px | 24px | 400 |
| `#bare` `h2.h2` | **36px** | 41.4px (1.15) | 400 |
| `#demoted` `h3.h4` | **20px** | 26px (1.3) | 400 |
| `#untouched` `h1`, no class | **16px** | 24px (1.5, inherited) | 400 |
| `#utility` `h2.h2.text-xs` | 12px | 16px | 400 |
| `#hook` `h5.h5` | 16px | 24px | 400 |
| `#clamp1` `h1.h1` | 56px | 61.6px (1.1) | 400 |
| `#three` `h3.h3` | 30px | 36px (1.2) | 400 |

This settles four claims at once. `#bare` is at the `--heading-2` ceiling, not
preflight's inherited 16px — D4's first row, decided on specificity inside a
shared `@layer base`. `#untouched` is at 16px/24px, identical to the `p` beside
it: the package does not touch a classless heading. `#hook` is at body size,
confirming D6 ships no `.h5` rule. And every element computes 400 — D5 ships no
weight, and preflight's `font-weight: inherit` stands.

Line-height comes from the `.hN` rules, not from `html`'s 1.5: 61.6/56 = 1.1,
41.4/36 = 1.15, 36/30 = 1.2, 26/20 = 1.3. The classless `#untouched` is the
control at 24/16 = 1.5, which is what an unstyled 56px `h1` would have rendered
on.

### D4's competing-rule table

`#bare` (`h2.h2`) in each fixture, all loaded top-level at **1720px**. `3rem` is
48px at a 16px root; ours is 36px at this width.

| Consumer rule | `#bare` measured | Winner | D4 predicted |
| --- | --- | --- | --- |
| none (preflight only) — `fixture-bare` | 36px | ours | ours — **agrees** |
| `@layer base { h2, .h2 }` after ours — `fixture-twin` | 48px | theirs | theirs — **agrees** |
| the same twin **before** ours — `fixture-twin-before` | 36px | ours | conditional on order — **agrees** |
| unlayered `.h2` — `fixture-unlayered` | 48px | theirs | theirs — **agrees** |
| `@layer components { .h2 }` — `fixture-components` | 48px | theirs | theirs — **agrees** |
| `@layer base { h2 }`, bare tag only — `fixture-baretag` | **36px** | **ours** | ours — **agrees, and this is the defect** |

Row three is the one the spec hedged on ("theirs wins, *conditionally*"). The
hedge is correct and now measured in both directions: the identical twin rule
wins at 48px when imported after the package and loses at 36px when imported
before it. Nothing about the rule changes — only the README's install order.

`#utility` (`h2.h2.text-xs`) measured 12px/16px in `fixture-bare`,
`fixture-twin`, `fixture-twin-before`, `fixture-components` and
`fixture-baretag`: the utility beats both the package and a consumer's
`@layer components` rule, per D4's fifth row.

**One consequence D4 does not state.** In `fixture-unlayered`, `#utility`
measured **48px**/64px — the consumer's unlayered `.h2` beat `text-xs` as well
as the package. That follows from the same rule that makes their override work
(unlayered beats every layered rule), but it means the row-3 escape hatch costs
a consumer their own Tailwind utilities on that selector. It contradicts nothing
in the spec; it is a cost the spec does not price.

### The bare-tag hazard, measured

The most important row, and it behaves exactly as the Risks entry says.

In `fixture-baretag` the consumer writes `@layer base { h2 { font-size: 3rem } }`
after the package's import — the strongest position a bare-tag rule can occupy —
and `#bare` (`<h2 class="h2">`) still computes **36px**. The package wins over
the consumer's own heading CSS, silently.

The control that proves the rule is live rather than absent: an `<h2>` carrying
**no class** was appended to `fixture-baretag.html`'s `<main>` at runtime via
`javascript_tool` (no recompile — a classless element generates no utilities) and
computed **48px**/72px. Same stylesheet, same page, same layer: the consumer's
rule applies everywhere the package's class is absent, and loses everywhere it is
present. `(0,1,0)` beats `(0,0,1)` regardless of source order.

This is now measured, not reasoned about. The Risks entry stands as written.

### The clamp across viewports

`resize_window` was not used. `iframe-host.html` embeds `fixture-bare.html` in
same-origin iframes of fixed width; `vw` resolves against an iframe's own initial
containing block, so each is a genuinely distinct CSS viewport. Widths 375 and
1400 were declared in the file; the 800 column was produced by an iframe appended
at runtime via `javascript_tool` and awaiting its `load` event. Each iframe's
`contentWindow.innerWidth` was read and confirmed to equal its declared width.
The host tab's own viewport stayed at 1720px throughout.

| Element | 375px | 800px | 1400px |
| --- | --- | --- | --- |
| `h1.h1` | 36px / 39.6px | 45.36px / 49.896px | 56px / 61.6px |
| `h2.h2` | 30px / 34.5px | 32.8px / 37.72px | 36px / 41.4px |
| `h3.h3` | 20px / 24px | 24.64px / 29.568px | 30px / 36px |
| `h3.h4` | 18px / 23.4px | 18.88px / 24.544px | 20px / 26px |
| `h5.h5` | 16px / 24px | — | 16px / 24px |
| `h1`, no class | 16px / 24px | — | 16px / 24px |

The values **move**, and they move by interpolation rather than by stepping: the
800px column is neither endpoint, and `--heading-1` there computes 45.36px
against `1.73rem + 2.21vw` = 27.68 + 17.68 = 45.36px exactly. The 375px column
reproduces the Tokens table's floors (36 / 30 / 20 / 18) and 1400px — comfortably
past the 1281–1309px crossovers — reproduces its ceilings (56 / 36 / 30 / 20).

`h5.h5` and the classless `h1` do not move, which is the point of listing them:
they are at 16px because nothing sizes them, in both viewports.

### Unobserved

Not measured, and not to be read as passing:

- **Every other engine.** Chrome 150 only. Nothing here says anything about
  Gecko or WebKit.
- **Whether a real consumer's bundler preserves the import order these fixtures
  assume.** The fixtures compile a hand-written entry with `@tailwindcss/cli`
  directly, so the order holds by construction. Next 16 / PostCSS / Turbopack
  were not exercised, and D4's row three depends entirely on that order.
- **The package's built `dist/styles.css`.** The fixture imports a verbatim copy
  of `src/styles/tokens.css`; `scripts/copy-styles.mjs` was not in the loop.
- **The `Heading` component itself.** The fixtures use hand-written markup
  matching its documented output (`<h3 class="h4">`), not React render output.
  The component's own contract is covered by its jsdom tests.
- **A root font-size other than 16px.** brillen-werk's `html { font-size: 18px }`
  at `md` shifts every crossover, as the Tokens section says; not measured.
- **The exact ceiling-engagement widths** (1281 / 1285 / 1287 / 1309px). Only
  375, 800 and 1400 were sampled.
- **A consumer overriding `--heading-N` from their own `@theme`,** or supplying
  an invalid value.
- **A consumer-defined `.h5`/`.h6` rule.** Only the no-rule case was measured.
- **`!important`, inline styles, active transitions, `@scope` proximity, and a
  consumer who redeclares `@layer` order.** D4 excludes all of these from its
  premises; none was tested.
- **`.h1`, `.h3` and `.h4` against competing consumer rules.** The competing-rule
  fixtures vary only `.h2`. The other three share the block, the layer and the
  specificity, so the same cascade applies — but that is an inference, not a
  reading.

## Risks and open questions

- **The package emits an unnamespaced class it does not own (D2).** A consumer
  whose `.h4` means something unrelated gets a silent collision, and nothing
  detects it. Accepted because the alternative — `sankara-h4` — makes the
  component render as nothing until every consumer writes six aliases, while the
  estate's real convention continues beside it. The README names the class as
  part of the install contract rather than an implementation detail.
- **A bare-tag-only consumer rule loses to the package (D4, row 4).** A project
  with `h1 { font-size: 3rem }` and no `.h1` twin sees `<Heading level={1}>`
  render at *our* size, silently overriding their own heading CSS. No surveyed
  project is exposed, but not for one uniform reason: four write the `hN, .hN`
  twin, and numbers.ch writes the class half alone (finding 4) — the opposite
  omission, and the safe one, since its `.h1` ties ours and wins on source
  order. The exposure is a future consumer who styles the tag only. The fix is
  one line — add `.h1` to the existing selector — and the README documents it.
  Note this row is also the only one in D4's table that a consumer *cannot*
  escape by moving their rule out of `@layer base`: unlayered or later-layer
  rules win outright, so the hazard is specific to a bare-tag rule that shares
  our layer. This is the mirror image of `RichText`'s risk: that
  component's defaults were too weak to beat preflight, this one's are strong
  enough to beat a consumer.
- **The medians are medians, not a designed scale.** They are a defensible
  centre of five real scales, not a typographic system with a consistent ratio —
  the h1→h2 step is 1.55× at the desktop end while h2→h3 is 1.2×. Any project
  with a considered scale will override all four, which D4's table makes easy.
- **No weight ships (D5), so headings render at body weight** until a project
  sets one. Defended above, and still the likeliest first complaint.
- **Two heading scales now exist in one package.** `--richtext-h1`–`h4` size
  headings inside CMS body copy; `--heading-1`–`4` size page headings. They are
  deliberately different — the estate's page `h1` is 36–56px against
  `RichText`'s 28–40px, because a page title is not a body-copy heading — but
  the names are close enough to confuse, and a consumer who overrides one and
  not the other gets an inconsistency the package cannot warn about. The README
  table must state which is which in the same breath.
- **`@layer base` is now used by two components,** and the invariant guarding it
  is an allowlist of selector substrings. A block whose selectors match none of
  the listed names — which `.h1`–`.h4` currently do not — is checked only for
  being layered at all, not for being layered *correctly*. Every future block
  has to be added to that suite by name or it silently escapes the guarantee.

## Non-goals

- Weight, family, colour, margin, `text-balance`, `hyphens` — D5. fgpfister owns
  its hyphen policy in project CSS; `RichText` D8 covers the rich-text half and
  explicitly declined to invent a body-copy policy on one project's evidence.
  The same restraint applies here.
- An `as` prop, or rendering anything but `h1`–`h6` — D5, finding 6.
- `.h5`/`.h6` defaults — D6.
- The eyebrow / headline / lead trio. fgpfister's `SectionHeader` is CMS-shaped
  and deliberately scoped to that project ("bloks whose header deviates
  structurally stay hand-written rather than growing this into a flag soup"). It
  stays in the template.
- Reading a level from CMS data, or any Storyblok awareness. Prohibited by
  CLAUDE.md; finding 5's site passes `blok.level` into `level` itself.
- A heading-level context that auto-increments nested headings. No project does
  this, and it makes the outline implicit — the opposite of D1.
- Runtime validation of `level`/`visual`. The estate's only CMS-driven level is
  a fixed option list, so the trust boundary is closed upstream; see the API
  section for why neither a clamp nor a throw improves on the type error.
- `tailwind-merge`-style class conflict resolution. `cn` is a plain join and
  stays one, so `className="h1"` alongside `visual={4}` is resolved by the
  stylesheet, not the class string — documented in the API section.
