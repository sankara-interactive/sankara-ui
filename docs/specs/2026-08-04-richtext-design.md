# `RichText` — Design

Date: 2026-08-04
Status: draft, revised after external review; pending implementation
Scope: Tier 3 of `next-storyblok-template/docs/enhancement-roadmap.md`, first half
of the typography work — `Heading` is a separate spec

## Problem

Every project renders CMS rich text, and every project styles it with a
hand-written class. The reason is not preference: Tailwind's preflight resets
margins to zero on every element, and sets `font-size` and `font-weight` to
`inherit` on `h1`–`h6`, `list-style: none` on lists, and `color`/`text-decoration`
to `inherit` on links. Rich text — the one kind of markup a consumer does not
author — therefore arrives as an undifferentiated grey wall unless something puts
the semantics back.

Four projects wrote that class themselves, in three different files and two
different languages. The fifth reached for `@tailwindcss/typography`.

## Evidence base

| Project | Rich text styling | Where |
| --- | --- | --- |
| brillen-werk.ch | hand-written `.richtext` | `styles/globals.css` |
| fgpfister.ch | hand-written `.richtext` | `styles/globals.css` |
| fairmed.ch-sb | hand-written `.richtext` | `styles/typography.scss` |
| nuwa.swiss | hand-written `.richtext` | `styles/base/typography.scss` |
| numbers.ch | `@tailwindcss/typography` | plugin |

Six findings:

1. **The structural core is already agreed.** fgpfister and brillen-werk both
   open with the same rule, character for character:

   ```css
   .richtext { & > :not(:last-child) { @apply mb-4 } }
   ```

   Both then style `a`, `ul`/`ol` and `li` with the same structure and different
   values.

2. **The call site is identical too:**

   ```tsx
   <div className="richtext">
     <RichTextRenderer text={blok.text} />
   </div>
   ```

   A wrapper carrying the class, with the project's own CMS renderer inside.
   Whatever ships must wrap children and must never touch Storyblok.

3. **Per-project list variants exist and stay put** — `.feature-list` in
   brillen-werk, `.-pros-list` and `.-cons-list` in fgpfister.

4. **Tables are a latent bug.** No project styles `table` inside rich text, but
   `table` appears 14 times across the generated Storyblok schemas — the field
   type is live and an editor can insert one today.

5. **`code`/`pre` has no footprint** — not in any stylesheet, and `code_block`
   appears in no schema in the estate.

6. **Quotes are dedicated bloks, not rich text.** `blockquote` appears only in
   `QuoteSection.tsx` (numbers.ch), `Quote.tsx` and `SuccessStoryCard.tsx`
   (fgpfister) — components with their own styling. But the Storyblok toolbar
   can still emit one inside a rich text field, which is why D4 gives it a
   minimal fallback rather than nothing.

## Decisions

### D1 — Our own contract, not `@tailwindcss/typography`

The plugin's value is mostly appearance: a full type scale, colours, spacing and
`max-width: 65ch`. That is the part every project overrides, and the part this
package has spent four components refusing to ship. Its reputation for being
awkward to override is the same complaint from the other direction.

Four of five hand-rolled roughly thirty lines instead. This ships those lines
once, with the values behind tokens.

### D2 — Restoring semantics is not shipping appearance

`Button` ships no colours or padding because a consumer authors every button.
Rich text is the opposite: nobody authors it, preflight has stripped it, and a
package that leaves it bare leaves it unreadable.

So `RichText` does set sizes, weights, markers and spacing — enough to work with
no project setup. Every value is a token or a documented floor, and D3 makes a
project's own rules win.

### D3 — `@layer base`, container `:where()`-wrapped, element tokens bare

The first draft put these rules in `@layer components` and claimed a project's
own `@layer base` heading rules would still win. **That is false**, and external
review caught it: cascade layers are resolved *before* specificity, and Tailwind
declares `@layer theme, base, components, utilities`, so anything in `components`
beats anything in `base` regardless of selectors.

This matters concretely — brillen-werk's heading rules live in `@layer base`
(`styles/globals.css:26`).

Measured on a compiled Tailwind 4.3.3 fixture in Chrome, with a project rule
`@layer base { h2 { font-size: 3rem; font-weight: 900 } }` and a `text-xs`
utility:

| Our rules in | Project's own `h2` | A `text-xs` utility |
| --- | --- | --- |
| `@layer components`, normal specificity | **loses** — 32px/700, ours wins | wins, 12px |
| `@layer base`, `:where()` wrapped | **wins** — 48px/900 | wins, 12px |

So the rules moved into `@layer base` — that part of the conclusion stood.
What shipped next to it did not: every selector fully wrapped in `:where()`,

```css
@layer base {
  :where(.sankara-richtext) :where(h2) { … }
}
```

on the reasoning that zero specificity is the safest possible floor. The table
above only ever tested a project *with* a competing `h2` rule; it never tested
a bare project, which is exactly the shape every consumer starts as before they
write any heading CSS of their own. The Task 5 browser pass did test that case,
against the real compiled stylesheet, and it failed: Tailwind's own preflight
lives in the same `@layer base` this block does, and several of its resets are
plain type selectors — `h1, h2, h3, h4, h5, h6 { font-size: inherit;
font-weight: inherit }`, `ol, ul, menu { list-style: none }`, `a { color:
inherit; text-decoration: inherit }` — each specificity `(0,0,1)`. A rule
wrapped down to `(0,0,0)` loses outright to a `(0,0,1)` rule in the same layer,
regardless of which one is later in source order. Measured: a fully-wrapped
`h2` computed `16px`/`400` in a bare project — indistinguishable from body
copy, no markers on any list, links inheriting `color` and `text-decoration`
same as plain text. The package's defaults never applied unless a project
*already* had a competing rule of its own, which inverts D2's premise that
they work with no project setup.

**Corrected, after the browser pass:** `:where()` stays on the container —
`.sankara-richtext` / `.sankara-richtext-measure` still contribute zero
specificity, so the class itself never out-ranks anything — but the element
token after it ships bare:

```css
@layer base {
  :where(.sankara-richtext) h2 { … }
}
```

That lands the compound selector at `(0,0,1)`: tied with preflight's own
reset, not beneath it. Two source-order dependencies make that tie resolve the
right way twice over. First, this stylesheet is imported after Tailwind's
preflight (`@import "tailwindcss"` before `@import "@sankara-ui/core/styles.css"`,
as the README's install order requires) — so our `(0,0,1)` rule is later than
preflight's `(0,0,1)` rule, and later wins a tie, restoring the defaults in a
bare project. Second, a project's *own* bare `h2` rule is, by the same install
order, imported after ours — so it ties us in turn and wins the same way. The
package's rule is the middle link in a three-way chain (preflight, us, project),
each tying the one before it and winning on source order, not on `:where()`
alone.

Comma-grouped selectors (`h5, h6`; `li > ul, li > ol`; `th, td`) use `:is()`,
not `:where()`, for the same reason: `:where()` would zero them back out,
undoing the fix for exactly those selectors. `:is()` takes the specificity of
its most specific argument rather than zeroing it, so `:is(h5, h6)` still lands
at `(0,0,1)` like every bare tag here. The measure's exemption list —
`:is(table, figure, img, video, iframe, [data-wide])` — is deliberately higher
still, at `(0,1,0)` from the attribute selector, because it has to out-rank the
plain `> *` measure rule immediately above it, not merely tie preflight.

This scheme is now load-bearing on the documented install order, not just on
`@layer base` and `:where()`: it is source order, not the layer or the
selector wrapping, that lets a project's own heading rule win. A project that
imports this package's stylesheet *after* its own CSS reverses the chain, and
that risk did not exist under the fully-wrapped shape, where specificity alone
(not source order) decided every match but silently lost the ones that
mattered. Re-run against the corrected stylesheet, in the browser, per the
`## Verification` section below: bare project now gets `24px`–`32px`/`600`
headings (clamp-dependent on viewport), `disc`/`circle`/`decimal` markers, and
underlined `--color-primary` links; a project's own `h2` rule still wins at
`48px`/`900`; a `text-xs` utility still wins at `12px`.

Note this is the one place the package deviates from "component styles live in
`@layer components`". `tokens.test.ts`'s layering invariant must be updated to
accept `base` for this block, and the reason recorded there.

### D4 — What is covered, and the policy for what is not

Covered, with the complete declaration set in the CSS Contract section below:
the flow rhythm, `h1`–`h4` (sized), `h5`/`h6` (weight only), `ul`/`ol`/`li`
including nesting, `a`, `table`/`th`/`td`, `hr`, and `blockquote` as a minimal
fallback.

`table` is covered on the strength of finding 4. `blockquote` gets a border and
padding only — enough that a toolbar-inserted quote is not mistaken for body
copy, and deliberately not the estate's quote treatment, which belongs to the
dedicated `Quote` bloks in finding 6.

**Not covered, and the failure policy for each:**

| Node | Behaviour if it appears | Why |
| --- | --- | --- |
| `code`, `pre` | Preflight's monospace only; no padding or background | No footprint anywhere (finding 5) |
| `figure`, `figcaption`, `img` | Pass-through; sized by the consumer's own rules | Media layout is the consumer's; the measure explicitly exempts them (D6) |
| Embedded bloks | Pass-through, but they receive flow spacing as siblings (D7) | The renderer owns them |
| Anything newer in Storyblok's schema | Unstyled, inheriting body copy | Coverage is dated evidence; the browser pass re-runs against a realistic document |

This table is the contract: uncovered nodes degrade to readable body text, never
to broken layout. Nothing here throws or warns — CSS cannot.

### D5 — Both a class and a component

The class is the artifact; the component is ergonomics.

```tsx
<RichText>
  <RichTextRenderer text={blok.text} />
</RichText>
```

renders `<div class="sankara-richtext sankara-richtext-measure">`. Consumers with
their own wrapper use the class directly, which is what all five do today.

External review argued for shipping the classes alone and adding the component
only after evidence of wrapper boilerplate. Recorded and overruled: the estate
already writes that wrapper five times over (finding 2), and the component owns
the measure decision (D6), which is otherwise a second class name to remember.
It is a server component — no hooks, no handlers.

### D6 — Measure applies to text children, not the container

The first draft put `max-inline-size` on the wrapper. External review caught the
consequence: a `68ch` box also squeezes tables, images and embedded bloks, which
contradicts D4 covering tables at all.

So the modifier constrains text-bearing children and exempts the rest:

```css
.sankara-richtext-measure > * { max-inline-size: var(--richtext-measure) }
.sankara-richtext-measure > :is(table, figure, img, video, iframe, [data-wide]) {
  max-inline-size: none;
}
```

`[data-wide]` is the documented escape hatch for an embedded blok that must run
full width.

On by default: unbounded body copy across a wide viewport is the more common
defect, and inside a card narrower than the measure it is inert.

**The measure sets width only.** A constrained block stays start-aligned; the
package does not centre it, because `margin-inline: auto` in the package's own
rules would be one more thing to override. Consumers centre it themselves.

`68ch` is a heuristic, not a measurement: `ch` is the advance width of "0", so
the same number is a different line length in every brand's typeface. The token
exists precisely so a project with a wide face can lower it.

### D7 — Flow spacing via the owl selector

```css
:where(.sankara-richtext) > * + * { margin-block-start: var(--richtext-flow) }
```

Equivalent to the estate's `> :not(:last-child) { margin-bottom }` for the case
that matters, and preferable: no trailing margin, and a logical property that
follows writing mode.

Margin collapsing is not a concern *in the package's own output* because
preflight has already set every element's margin to zero. Where a project adds
its own heading margins — brillen-werk's `h1 { mb-6 }` — the project's margin and
this one are adjacent and collapse to the larger, which is the correct outcome
and worth documenting rather than fighting.

The owl spaces **every** direct child equally, including embedded bloks, full
width galleries and empty paragraphs a renderer emits. That is a documented
property of the contract, and the browser pass tests it against a document
containing an embedded blok.

### D8 — Hyphenation, its scope, and the `lang` dependency

Ported from fgpfister, the only project that solved it:

```css
hyphens: auto;
hyphenate-limit-chars: 14 5 5;
```

Every site in this estate is German-language, and German compounds
("Unternehmensnachfolge") overflow narrow columns. Plain `hyphens: auto` also
chops short words — "un-sere" — so the limit keeps anything under fourteen
characters whole.

**Scope: headings only**, matching fgpfister's own scope. External review noted
that compounds also appear in paragraphs, table cells and list items, and that
automatic hyphenation in large display type can look awkward. Both are true. The
estate has taken this decision for headings and no further, and this spec does
not invent a body-copy policy on one project's evidence. If a project needs it in
body copy, that is a modifier class and new evidence.

**`lang` dependency:** `hyphens: auto` does nothing without a `lang` attribute,
and the *nearest* `lang` must describe the *content* — a German page-level `lang`
is wrong for an English rich text field embedded in it. The component passes
`lang` through like any other prop, so a mixed-language page sets it per field.
The README must state this, or the feature silently does nothing.

**Support:** `hyphens: auto` is broadly supported; `hyphenate-limit-chars` is
not, and Firefox only added it in 137. Where it is missing, `hyphens: auto` still
applies and short words *will* break. That is a degradation, not a failure, and
the browser pass records which engines showed which behaviour rather than
asserting "short words never break" as a universal.

## CSS Contract

The complete rule set, so implementation is transcription rather than invention.
Every selector lives inside `@layer base` per D3, with `.sankara-richtext`
itself `:where()`-wrapped and the element token bare (`:where(.sankara-richtext)
h2`, not `:where(.sankara-richtext) :where(h2)`) — the wrapper is elided below
for readability, the bareness is not: it is the specificity `(0,0,1)` D3
depends on. Comma-grouped selectors (`h5, h6`; `li > ul, li > ol`; `th, td`)
use `:is()` in the same position, which preserves that specificity instead of
zeroing it.

| Selector | Declarations |
| --- | --- |
| `.sankara-richtext > * + *` | `margin-block-start: var(--richtext-flow)` |
| `h1` | `font-size: var(--richtext-h1)`; `font-weight: 600`; `line-height: 1.15`; `hyphens: auto`; `hyphenate-limit-chars: 14 5 5` |
| `h2` | as `h1` with `var(--richtext-h2)`, `line-height: 1.2` |
| `h3` | as `h1` with `var(--richtext-h3)`, `line-height: 1.25` |
| `h4` | as `h1` with `var(--richtext-h4)`, `line-height: 1.3` |
| `h5, h6` | `font-weight: 600` only — no size, so they inherit body copy |
| `ul` | `list-style-type: disc`; `padding-inline-start: 1.25em` |
| `ol` | `list-style-type: decimal`; `padding-inline-start: 1.5em` |
| `ul ul` | `list-style-type: circle` |
| `ul ul ul` | `list-style-type: square` |
| `ol ol` | `list-style-type: lower-alpha` |
| `li + li` | `margin-block-start: 0.25em` — list rhythm is tighter than block flow, and the owl does not reach list items |
| `li > ul, li > ol` | `margin-block-start: 0.25em` — nested lists are not direct children of the container |
| `a` | `color: var(--color-primary)`; `text-decoration-line: underline`; `text-decoration-thickness: 1px`; `text-underline-offset: 2px` |
| `table` | `border-collapse: collapse`; `inline-size: 100%`; `text-align: start` |
| `th, td` | `border: 1px solid var(--color-muted)`; `padding: 0.5em 0.75em` |
| `th` | `font-weight: 600`; `text-align: start` |
| `hr` | `border: 0`; `border-block-start: 1px solid var(--color-muted)` |
| `blockquote` | `border-inline-start: 2px solid var(--color-muted)`; `padding-inline-start: 1em` |

Underline on links is not optional: preflight sets `text-decoration: inherit`, so
a link distinguished by colour alone fails both discoverability and the
colour-is-not-the-only-cue rule. Hover, focus and visited states are the
consumer's.

**Wide tables are not solved here.** `inline-size: 100%` fills the available
width; a table with more columns than fit still overflows. Wrapping it in a
scroll container changes the accessibility tree and needs a label, so the
consumer's renderer owns that, and the README says so.

## API

```ts
export type RichTextProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  children: ReactNode
  /** Constrain line length to --richtext-measure. Default true. */
  measure?: boolean
}
```

- Renders a `<div>` carrying `sankara-richtext`, plus `sankara-richtext-measure`
  unless `measure={false}`.
- `className` merges after the component's own; `lang`, `ref` and every other
  prop reach the `<div>` — under React 19 `ref` is an ordinary prop, as in
  `Disclosure`.
- No `as` prop. A consumer who needs `<article>` uses the class directly.

## Tokens

Six added, each in `TOKENS`, the `@theme` block and the README table:

| Token | Default | Purpose |
| --- | --- | --- |
| `--richtext-flow` | `1rem` | Vertical rhythm between blocks |
| `--richtext-measure` | `68ch` | Line length when the measure applies |
| `--richtext-h1` | `clamp(1.75rem, 1.35rem + 2vw, 2.5rem)` | Fluid `h1` inside body copy |
| `--richtext-h2` | `clamp(1.5rem, 1.2rem + 1.4vw, 2rem)` | Fluid `h2` |
| `--richtext-h3` | `clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)` | Fluid `h3` |
| `--richtext-h4` | `clamp(1.125rem, 1.05rem + 0.4vw, 1.25rem)` | Fluid `h4` |

Links use `--color-primary`; table borders, `hr` and `blockquote` use
`--color-muted`. No new colour tokens.

The clamp values are the least evidence-backed part of this spec — no two
projects agree on a type scale, so they are chosen to be reasonable rather than
derived. D3 makes them a floor that any project rule overrides, which is what
makes inventing them acceptable at all.

## Testing

A stylesheet contract test, in the shape of `src/styles/button-css.test.ts`:

- Every row of the CSS Contract table exists and sets what it claims.
- The six tokens are declared with defaults; `tokens.test.ts` covers their
  presence in `TOKENS`.
- The block sits inside `@layer base`, `.sankara-richtext`/
  `.sankara-richtext-measure` are `:where()`-wrapped, and the element token
  after them is bare (or `:is()`-grouped) — a container wrapped any other way
  would silently outrank a consumer's own rule, and an element token wrapped
  in `:where()` would silently lose to Tailwind's own preflight, which is the
  defect D3 records and this is the invariant that protects the fix.
- The measure lives on the modifier class, and the exemption list is present.
- The flow rule uses `margin-block-start`, not a physical property.
- `hyphenate-limit-chars` accompanies every `hyphens: auto`.

Component tests:

- Renders a `<div>` with `sankara-richtext`.
- `sankara-richtext-measure` present by default, absent with `measure={false}`.
- Children render with no wrapper of the component's own around them.
- `className` merges rather than replaces; `lang`, rest props and `ref` reach the
  div.

Each assertion proven by mutation.

Not testable in jsdom, and stated rather than faked: cascade layer resolution,
hyphenation, `clamp()`, `ch` units, table borders, marker restoration. jsdom
computes no layout and applies no UA stylesheet worth trusting.

## Browser verification

Unusually load-bearing, because almost nothing above is observable in jsdom. The
pass must use a **compiled Tailwind fixture**, not the raw stylesheet — the
cascade claims are only true after Tailwind emits its layer order. The harness
used to settle D3 is the model: a consumer-shaped entry importing `tailwindcss`
and the package stylesheet, compiled with `@tailwindcss/cli`, loaded in Chrome.

Confirm:

- A project's own `@layer base` `h2` rule beats ours, and a `text-xs` utility
  beats both — the D3 table, re-run against the real stylesheet.
- A long German compound breaks at a narrow measure; a short word does not;
  removing `lang` from the ancestor stops hyphenation entirely.
- List markers, nested markers, indents, table borders and `hr` all render.
- The clamp scale resolves and moves between a narrow and a wide viewport.
- The measure applies at `68ch` to paragraphs, and a `table` inside the same
  container is *not* constrained by it.
- Flow spacing applies around an embedded blok, and an empty paragraph produces a
  visible gap — the documented D7 property.

Record which engine showed which `hyphenate-limit-chars` behaviour rather than
asserting a universal.

## Verification

Two rounds, both against **Chrome 150.0.7871.115 on macOS** — confirmed via
`navigator.userAgentData` brands (`Chromium 150`, `Google Chrome 150`) and
`getHighEntropyValues(['uaFullVersion'])`; the platform build number is not
recorded. In round 1 the automation's own output filter blocked the
`platformVersion` string (flagged as looking like token/JWT data) on every
phrasing tried; round 2's record carries no platform build number at all, and
no round-2 attempt to read one is on record either. One engine only, both
rounds; see below for what this does not cover.

**Round 1 (2026-08-04, first stylesheet shape — fully `:where()`-wrapped)**
ran the brief's specified check — a fixture with a project rule `@layer base
{ h2 { font-size: 3rem; font-weight: 900 } }` and a `text-xs` utility — and it
passed exactly as specified: project rule `48px`/`900`, utility `12px`.
Investigating *why* it passed (the project's own `h2` is itself a plain type
selector tied with Tailwind's preflight, winning the tie on source order —
our zero-specificity rule was never a contender in that particular match)
led to testing the case the brief's own fixture doesn't isolate: a bare
project with no competing CSS at all. That failed. Confirmed in two
independent builds (a from-scratch fixture with zero project CSS, and the
real `richtext--default` Storybook story): `h2` computed `16px`/`400` instead
of the clamp, every list computed `list-style-type: none`, links computed
`text-decoration-line: none` / `color: rgb(0, 0, 0)`. Root cause: Tailwind's
own preflight — `h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight:
inherit; }`, `ol, ul, menu { list-style: none; }`, `a { color: inherit;
text-decoration: inherit; }` — lives in the same `@layer base` as the
package's rules and is a plain type selector, specificity `(0,0,1)`; a rule
fully wrapped in `:where()` is `(0,0,0)` and loses outright to `(0,0,1)` in
the same layer regardless of source order. Full round-1 measurements are in
`.superpowers/sdd/2026-08-04-richtext-implementation/task-5-report.md`. That
finding produced the stylesheet change D3 now describes — container
`:where()`-wrapped, element token bare — and this section was rewritten
after re-verifying the corrected shape, below; nothing here still describes
the broken shape as current.

**Round 2 (2026-08-04, corrected stylesheet, commit `3b07a0d`)** re-ran every
check from the brief against the fixed CSS.

Methodology, updated from round 1: the `claude-in-chrome` automated tab still
reports `visibilityState: "hidden"`, so `requestAnimationFrame` was never
awaited; every measurement is a synchronous `getComputedStyle` or box-geometry
read (the recorded geometry is box width/height and `scrollWidth`/
`clientWidth`) after forcing layout with `document.body.offsetHeight`. `resize_window` again never moved
`window.innerWidth` in the automated tab — this session's tab was fixed at
`320×692` throughout, regardless of the size requested — so narrow-viewport
checks used the fixed `320px` viewport directly (no artificial narrowing
needed) or a further-narrowed containing block via inline `max-width` on
`body`, and the **wide**-viewport clamp reading used a same-origin `<iframe>`
set `1600px` wide and injected into the page: `vw` units resolve against an
iframe's own initial containing block, so this is a real, distinct viewport
width for CSS purposes, not a simulation.

**Central check, re-run:**

| Check | Result |
| --- | --- |
| Project's own `@layer base` `h2` beats ours | pass — `48px` / `900` |
| `text-xs` utility beats both | pass — `12px` |

Unchanged from round 1 — this was never the broken case.

**Bare-project defaults, re-run — this is what round 1 found broken:**

| Check | Result |
| --- | --- |
| `h2` font-size/weight, bare project, `320px` viewport | pass — `24px`/`600` (clamp floor: `clamp(1.5rem, 1.2rem + 1.4vw, 2rem)` at `320px` vw evaluates below `1.5rem`, so it clamps to the `24px` floor) |
| `h2` font-size, bare project, `1600px` iframe viewport | pass — `32px`/`600` (clamp ceiling: `2rem`) — confirms the clamp actually moves between narrow and wide, not just that it resolves to *some* value |
| `ul`/`ol`/nested `ul` markers, bare project | pass — `ul` `disc`, `ol` `decimal`, `ul ul` `circle` |
| `a` colour/underline, bare project | pass — `color: oklch(0.55 0.22 275)` (`--color-primary`), `text-decoration-line: underline` |
| `table`/`th`/`td` borders, bare project | pass — `border-collapse: collapse`, `th`/`td` `1px solid`, `th` `font-weight: 600` |

Same checks, in the real `richtext--default` Storybook story (`320px`
viewport, so the clamp floor applies): `h2` `24px`/`600`, `h3` `20.16px`,
`h4` `18.08px`, `ul` `disc`, nested `ul` `circle`, `ol` `decimal`, `a`
`oklch(0.55 0.22 275)`/`underline`, `table`/`th`/`td` `border-collapse:
collapse`/`1px solid` — headings, markers, link and table borders all pass,
matching the bare fixture. The same story also measured `hr` (`border-top:
1px solid`) and `blockquote` (`border-inline-start: 2px solid`), which the
bare fixture has no `hr`/`blockquote` in its markup to compare against —
those two are Storybook-only in this round.

**Unaffected checks — not touched by the D3 fix, since none of them compete
with a preflight type selector:**

| Check | Result |
| --- | --- |
| `hr` border | pass — `border-top: 1px solid`, `richtext--default` story, both rounds |
| `blockquote` border | pass — `border-inline-start: 2px solid`, `richtext--default` story, both rounds |
| `blockquote` padding | pass — `padding-inline-start: 16px`, `richtext--default` story, round 1 only; not re-queried in round 2, no reason to expect the fix touched it |
| D6 measure, the CSS property | pass — `max-inline-size: 685.312px` (`68ch` at `16px`/system-ui) on a paragraph in the project-override fixture, both rounds. That paragraph is the only element the measure was ever read on; no list, heading or other text child carries a recorded reading in either round |
| D6 measure in a containing block wide enough for it to bite, with `table`/container measured unconstrained | pass — round 1 only: at that session's `1720px` viewport (wider than the `68ch` measure), the paragraph's `max-inline-size` computed to `685.3125px` while the table and the container both *measured* `1720px` wide — genuinely unconstrained, not merely wide. The paragraph's own rendered box width was never read, in either round, so what is on record is the property in force beside measured-unconstrained siblings, not a measured narrow paragraph. Round 2's session viewport (`320px`) was already narrower than the measure, so the container capped the paragraph before the measure could; only the property value was reconfirmed there |
| D7 flow spacing: every child but the first gets `margin-block-start: var(--richtext-flow)`, including around the table | pass — `richtext--default` story, both rounds: first child `0px`, every subsequent child `16px` (10 children, round 2; matches round 1's identical reading of the same story). No raw fixture carries this measurement in either round — the `h2, ul, ol, p, table` fixture was used for font-size, marker, link and table-border checks in round 2, not for flow spacing |
| List rhythm: `li + li` and `li > ul` get `0.25em` | pass — `richtext--default` story, round 1 only (`4px` at `16px` font, both selectors); not re-queried in round 2, no reason to expect the fix touched it |

**D8 hyphenation — now demonstrated with the component's real clamp size,
not a stand-in font-size:**

| Check | Result |
| --- | --- |
| Long compound ("Unternehmensnachfolge") at its real `24px` clamp size, narrowed to a `160px` box, `lang="de"` | pass — wrapped to 2 lines (`57.59px` = `2 × 28.8px` line-height). `overflow-wrap`/`word-break` were not re-read at this size; round 1 read both as `normal` on the same fixture's heading at its `48px` stand-in size, and that is the only recorded evidence that nothing but `hyphens: auto` can produce the break |
| Same heading, `lang` removed from the ancestor | pass — back to 1 line (`28.8px`); `scrollWidth − clientWidth = 110px`, i.e. overflows instead of breaking |
| Short word ("unsere", 6 chars, under the `14`-char `hyphenate-limit-chars` floor), `lang="de"`, `30px` box | pass — stayed on one line (`28.8px`), overflowed by `45px` — Chrome 150 still honours the `14`-character floor at the corrected font size |
| **`richtext--narrow-column` story** — the story whose purpose is to demonstrate this | **pass, now** — wrapper is `288px` wide (`18rem` minus `p-8` padding = `224px` content), `h2` computed `24px`/`600` (the real clamp floor, not body copy), and wraps to 2 lines (`57.59px` height = `2 × 28.8px`). Round 1 measured this story rendering the heading as one line at `16px` because the clamp never applied; round 2 confirms the fix reaches this story specifically, not just the fixtures. |

Record only for this engine: Chrome 150 respects the `14`-character floor,
both before and after the stylesheet fix (the fix changes selector
specificity, not the hyphenation properties themselves). Firefox added
`hyphenate-limit-chars` in 137 per D8; no Firefox build was available here to
compare, so whether Firefox 137+ shows the same short-word behaviour, and
what pre-137 Firefox or Safari do (`hyphens: auto` alone, so short words
*will* break there per D8's own prediction), is unobserved.

**Unobserved, explicitly:**

- Real Safari and Firefox, any version. Everything above is single-engine
  (Chrome 150). D8 already predicts different `hyphenate-limit-chars`
  behaviour pre-Firefox-137 and in Safari; unconfirmed.
- A real screen-reader session over the restored semantics (list markers,
  table headers, link underlines) — both rounds inspected computed CSS and
  geometry only.
- Whether `window.innerWidth` genuinely cannot be changed via `resize_window`
  in this automation, or whether some other mechanism would move it — the
  iframe-viewport technique above worked around this for the clamp check, but
  the underlying tool behaviour itself is unexplained across two sessions in
  two different fixed sizes (`1720px` in round 1, `320px` in round 2).
- Whether the two source-order dependencies D3 now names — this stylesheet
  imported after Tailwind's preflight, a project's own rules imported after
  this stylesheet — hold in a real consumer's build pipeline (bundler import
  order, CSS-in-JS extraction order) rather than the single-file
  `@tailwindcss/cli` fixtures and the Storybook Vite build used here. All
  fixtures and the Storybook build follow the README's documented install
  order by construction; a consumer that doesn't was not tested.

**Verdict: the check this task exists to run now passes.** Round 1's defect —
package defaults losing to Tailwind's own preflight in a bare project, with
no consumer rule involved — is corrected and re-verified in a from-scratch
fixture and in the real Storybook build: bare-project headings, list markers,
and link styling all restore as D2 and D4 specify, the clamp scale measurably
moves between a `320px` and a `1600px` viewport, and the `NarrowColumn` story
now demonstrates the hyphenation it was written to demonstrate. A project's
own rule and a `text-xs` utility both still win, unchanged. Nothing in this
round was adjusted to make a check pass — the stylesheet was already fixed
(commit `3b07a0d`) before this round ran; this section only re-measures it.

## Risks and open questions

- **Fixed, but load-bearing on install order.** D3's first shipped shape —
  every selector fully `:where()`-wrapped — lost to Tailwind's own preflight
  by default, with no project CSS involved: `h1`–`h6` sizing, list markers,
  and link colour/underline all failed to apply out of the box (see
  Verification, round 1). The corrected shape (container `:where()`-wrapped,
  element token bare, landing at specificity `(0,0,1)`) fixes this, re-verified
  in round 2 — but it now depends on source order rather than specificity
  alone: this stylesheet must be imported after Tailwind's preflight, and a
  project's own competing rule must be imported after this stylesheet, both
  already true by the README's documented install order but not something the
  CSS itself can enforce. A consumer who imports this package's stylesheet
  before their own base styles, or before Tailwind, breaks the chain in a way
  the fully-wrapped shape structurally couldn't. Nothing currently detects
  that misordering; it would need to be a review note or a runtime check in
  the package's own test suite of its *own* CSS, not something testable
  against a consumer's build.
- **D3 puts package rules in `@layer base`,** which no other component here does.
  It is right for defaults meant to be overridden, and wrong for anything that
  must hold — a future rule in this file that must not be overridden belongs in
  `components`, and the test must not let it drift silently.
- **The clamp defaults are invented** (see Tokens). They are a floor, and every
  project that has heading rules will step over them.
- **`hyphenate-limit-chars` support is uneven**, so typography differs across
  engines by design (D8).
- **Element coverage is dated evidence.** Storyblok's rich text can grow node
  types; D4's table is what the estate uses today, and the browser pass should
  be re-run against a realistic document whenever a project enables a new one.
- **`68ch` is a heuristic**, not a measured line length (D6).

## Non-goals

- Rendering Storyblok documents. Prohibited by CLAUDE.md; the template owns
  `RichTextRenderer`.
- `code`/`pre`, `figure`/`figcaption` — per D4.
- The estate's quote treatment. `blockquote` gets a fallback, not a design;
  dedicated `Quote` bloks own the real thing.
- Page-level heading scale and the semantic/visual split — the `Heading` spec.
- Wide-table scroll containers, which change the accessibility tree and need a
  label the package cannot write.
- `@tailwindcss/typography` compatibility or a migration path. numbers.ch keeps
  the plugin; nothing here conflicts with it.
