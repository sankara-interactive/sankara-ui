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
it, and 101 call sites across five projects spell it out by hand.

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

1. **The mechanism is unanimous, 5 of 5.** Four write the `hN, .hN` twin
   verbatim; numbers.ch writes the class half only. No project styles the tag
   alone.

2. **The call site is unanimous too, 101 times over.** Counted by grepping for a
   visual heading class in a `className`: brillen-werk 13, fgpfister 14, fairmed
   35, nuwa 10, numbers 29. The dominant shape is `<h3 className="h4">` — a card
   title, demoted visually and kept correct in the outline:

   ```tsx
   <h3 className="h4 group-hover:text-brown transition duration-300">{blok.headline}</h3>
   ```

   (`brillen-werk.ch/components/nestables/Card.tsx:23`)

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

### D1 — The component owns the split; the project owns the look

`Button` ships no colours or padding because a consumer authors every button.
`RichText` does ship sizes because nobody authors CMS output and preflight has
stripped it. Page headings are the `Button` case — every one is authored — so
the component ships the *mechanism* and the project keeps the *appearance*.

What ships is small enough to state in full:

```tsx
<Heading level={3} visual={4}>Title</Heading>
// → <h3 class="h4">Title</h3>
```

The type system carries the constraint that a `className` string cannot: `level`
and `visual` are `1 | 2 | 3 | 4 | 5 | 6`, so `visual={7}` and `level="h3"` are
compile errors, and `level` is required — the outline decision is never
implicit.

**Recorded honestly:** over `<h3 className="h4">` this saves keystrokes nowhere.
Its value is that the two levels become two named, typed arguments instead of
one string where a typo is silent, plus the one dynamic-level site (finding 5)
that currently hand-rolls a tag switch. That is a modest case, and it is the
whole case.

### D2 — The emitted class is `h1`–`h6`, unnamespaced

Every other class in this package is namespaced (`sankara-button`,
`sankara-richtext`, `sankara-popover`). This one is not, and the reason is
finding 1: `.h1`–`.h6` is already defined in all five projects. Emitting
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

A hand-written `<h1>` with no class is untouched. Every `<Heading>` gets a
default.

**Cascade, derived from `tailwindcss@4.3.3` in this repo's `node_modules`.**
Verified from source, not from memory: `index.css:1` declares
`@layer theme, base, components, utilities`; inside `@layer base`, preflight
declares `html, :host { line-height: 1.5 }` and

```css
h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit }
```

at specificity `(0,0,1)` (`preflight.css:78–86`).

| Competing rule | Specificity | Outcome | Why |
| --- | --- | --- | --- |
| Preflight's `h1…h6` reset | `(0,0,1)`, `@layer base` | **ours wins** | `(0,1,0)` beats `(0,0,1)` in the same layer, on specificity alone |
| A consumer's `h1, .h1 { … }` twin | `(0,1,0)` on the class half | **theirs wins** | ties ours; their stylesheet imports after ours, later wins a tie |
| Any Tailwind utility (`text-xs`) | `@layer utilities` | **utility wins** | later layer beats earlier, regardless of specificity |
| A consumer's **bare-tag-only** `h1 { … }` | `(0,0,1)` | **ours wins** | and it should not — see Risks |

This is a strictly better position than `RichText`'s D3, which needed source
order for its defaults to apply at all. Here the default beats preflight on
specificity, so no import-order accident can leave a `<Heading>` unstyled. Only
the fourth row is a hazard, and it is bounded: all five projects write the twin.

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

So `.h5` and `.h6` are bare hooks — the mechanism without a default, which is
what D1 ships everywhere else anyway.

## API

```ts
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = Omit<ComponentPropsWithRef<'h1'>, 'children'> & {
  children: ReactNode
  /** Semantic level — the document outline. Renders <h1>…<h6>. */
  level: HeadingLevel
  /** Visual level — the class. Defaults to `level`. */
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

The clamps interpolate linearly between 375px and 1280px viewports, so each hits
its median endpoints exactly at those two widths. The estate's own mechanism is
a `md:` breakpoint step rather than a clamp; clamps are used here because
`RichText` already established them as this package's idiom, and a step would
need a breakpoint value the package would have to invent.

The median h1 lands within a rounding error of numbers.ch's shipped
`clamp(36px, 4.4vw, 56px)`, which is a useful check that the median is not an
artifact of averaging incompatible scales.

No new colour tokens. No weight, family, margin or spacing tokens — D5.

## Testing

Unusually ordinary for this package: no cascade claim lives in the component, so
the component tests are jsdom-adequate and complete.

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
- The four tokens are declared in `@theme` with defaults; `tokens.test.ts`
  covers their presence in `TOKENS`.

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

## Risks and open questions

- **The package emits an unnamespaced class it does not own (D2).** A consumer
  whose `.h4` means something unrelated gets a silent collision, and nothing
  detects it. Accepted because the alternative — `sankara-h4` — makes the
  component render as nothing until every consumer writes six aliases, while the
  estate's real convention continues beside it. The README names the class as
  part of the install contract rather than an implementation detail.
- **A bare-tag-only consumer rule loses to the package (D4, row 4).** A project
  with `h1 { font-size: 3rem }` and no `.h1` twin sees `<Heading level={1}>`
  render at *our* size, silently overriding their own heading CSS. All five
  surveyed projects write the twin, so the exposure is a future consumer who
  does not. The fix is one line — add `.h1` to the existing selector — and the
  README documents it. This is the mirror image of `RichText`'s risk: that
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
