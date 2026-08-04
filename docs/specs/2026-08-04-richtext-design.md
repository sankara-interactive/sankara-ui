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

### D3 — `@layer base` with `:where()`, not `@layer components`

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

So the rules ship inside `@layer base`, with every selector wrapped in `:where()`
for zero specificity:

```css
@layer base {
  :where(.sankara-richtext) :where(h2) { … }
}
```

A project's ordinary `h2` rule then wins on specificity within the same layer,
and utilities still win by layer order. The package's defaults become a floor
that anything can step over, which is what D2 requires and what the first draft
only asserted.

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
Every selector is `:where()`-wrapped inside `@layer base` per D3; the wrappers are
elided here for readability.

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
- The block sits inside `@layer base` and every selector is `:where()`-wrapped —
  a rule without `:where()` would silently outrank a consumer, so this is the
  invariant that protects D3.
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

Run 2026-08-04 against a compiled Tailwind 4.3.3 fixture (`@tailwindcss/cli`,
following the harness the D3 table itself used) and the Task 4 Storybook build
(`richtext--default`, `richtext--without-measure`, `richtext--narrow-column`,
confirmed from `index.json` rather than assumed), on **Chrome
150.0.7871.115 on macOS** — confirmed via `navigator.userAgentData` brands
(`Chromium 150`, `Google Chrome 150`) and `getHighEntropyValues(['uaFullVersion'])`;
the platform build number could not be read because the automation's own
output filter blocked the `platformVersion` string (flagged as looking like
token/JWT data) on every phrasing tried. One engine only; see below for what
this does not cover.

The `claude-in-chrome` automated tab reports `visibilityState: "hidden"`, so
`requestAnimationFrame` never fires there; every measurement below is a
synchronous `getComputedStyle`/`getBoundingClientRect` read after forcing
layout with `document.body.offsetHeight`, with `setTimeout` waits (not `rAF`)
where React needed a moment to render a story. `resize_window` changed the
OS-level window but never moved `window.innerWidth` in this automated tab (it
stayed at 1720 throughout), so the narrow-viewport checks below constrain
width via the page's own layout (a `body { max-width }` override on the raw
fixture, and the `NarrowColumn` story's own `max-w-[18rem]` wrapper) rather
than a true viewport resize — geometry is unaffected by which mechanism
narrows the containing block.

**Central check — D3's cascade claim, exactly as specified:** compiled a
fixture with a project rule `@layer base { h2 { font-size: 3rem; font-weight:
900 } }` and a `text-xs` utility, per the brief.

| Check | Result |
| --- | --- |
| Project's own `@layer base` `h2` beats ours | pass — `48px` / `900` |
| `text-xs` utility beats both | pass — `12px` |

That is the check the brief specifies, and it passes. Investigating *why* it
passes surfaced a defect the specified check cannot see, because it never
tests the no-competing-rule case.

**Defect found: the package's own defaults lose to Tailwind's own preflight,
with no consumer rule involved at all.** Preflight ships inside the same
`@layer base` Tailwind puts our rules in, and several preflight selectors are
plain type selectors — non-zero specificity — while every one of our
selectors is `:where()`-wrapped to zero specificity by design (D3). Within one
layer, layering does nothing; specificity decides, and zero always loses to
non-zero regardless of source order. Confirmed identically in two independent
builds — a from-scratch consumer fixture with no project CSS at all, and the
real Storybook build:

| Element | Preflight rule (verbatim, `@layer base`) | Our rule (verbatim, `@layer base`) | Specificity | Computed result |
| --- | --- | --- | --- | --- |
| `h1`–`h6` | `h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }` | `:where(.sankara-richtext) :where(h2) { font-size: var(--richtext-h2); font-weight: 600; … }` | preflight `(0,0,1)` vs ours `(0,0,0)` | **preflight wins** — `h2` computed `font-size: 16px`, `font-weight: 400` (body copy, not the `~32px`/`600` the clamp specifies) |
| `ul`/`ol` | `ol, ul, menu { list-style: none; }` | `:where(.sankara-richtext) :where(ul) { list-style-type: disc; … }` (and `ol`, `ul ul`, `ul ul ul`, `ol ol`) | preflight `(0,0,1)` vs ours `(0,0,0)` | **preflight wins** — every list, top-level and nested, computed `list-style-type: none`; no markers render |
| `a` | `a { color: inherit; text-decoration: inherit; }` | `:where(.sankara-richtext) :where(a) { color: var(--color-primary); text-decoration-line: underline; … }` | preflight `(0,0,1)` vs ours `(0,0,0)` | **preflight wins** — computed `color: rgb(0, 0, 0)`, `text-decoration-line: none` |

Reconciling this with the central check above: in that fixture, the project's
`h2` rule is *also* a plain `h2` selector — specificity `(0,0,1)`, tied with
preflight's `h1, h2, … { font-size: inherit }`. The tie resolves by source
order, and the project rule is declared last in `input.css`, so it beats
preflight. Our zero-specificity rule was never a contender in that match — the
measured `48px` proves the project rule beats preflight, not that our rule
beats anything. The brief's check is satisfied as written and still leaves the
no-override case, which is the component's actual value proposition (D2:
"`RichText` does set sizes, weights, markers and spacing … with no project
setup"), unverified — and that case fails.

This is not a corner case: it is the *empty* stylesheet case, produced simply
by putting `<RichText>` on a page with only Tailwind's own preflight present,
which is every consumer by construction (D1's premise is that these are Next
+ Tailwind v4 projects). The `richtext--default` story — real component, real
compiled `styles.css`, no project overrides — measured `h2` at `16px`/`400`
(clamp/weight never applied), `ol`/`ul`/nested `ul` all `list-style-type:
none`, and links at `text-decoration-line: none` / `color: rgb(0, 0, 0)`. The
`richtext--narrow-column` story, whose purpose is to show
"Unternehmensnachfolge" hyphenate, instead renders it as one line at `16px`
(`19.1875px` box height = one line-height, not two) — because the heading
never reaches a size large enough to need breaking, so the story does not
demonstrate the feature it exists to demonstrate.

**What was unaffected, and measured passing**, because the competing preflight
selectors there are the universal selector `*` (zero specificity, same as
`:where()`) rather than a type selector, so our block — declared after
Tailwind's own base content — wins the source-order tie:

| Check | Result |
| --- | --- |
| `table` border-collapse, `th`/`td` 1px solid borders, `th` weight 600 | pass — `border-collapse: collapse`; `th`/`td` `1px solid`; `th` `font-weight: 600` |
| `hr` | pass — `border-top: 1px solid` |
| `blockquote` | pass — `border-inline-start: 2px solid`, `padding-inline-start: 16px` |
| D6 measure: paragraph capped near `68ch`, table/container unconstrained | pass — paragraph `max-inline-size: 685.312px` (`68ch` at `16px`/system-ui), table width `1720px` = container width `1720px` = viewport width, i.e. both unconstrained |
| D7 flow spacing: every child but the first gets `margin-block-start: var(--richtext-flow)`, including around the table | pass — child 0 (`h2`) `0px`; every subsequent child (`p`, `h3`, `ul`, `h4`, `ol`, `p`, `table`, `hr`, `blockquote`) `16px` |
| List rhythm: `li + li` and `li > ul` get `0.25em` | pass — both `4px` at `16px` font |

**D8 hyphenation, tested in isolation on the raw compiled fixture** (not
through the broken heading size, since the story can't exercise it — see
above). Narrowed the containing block to `288px` and set the test heading's
font back to a size where the compound doesn't trivially fit, to test the
mechanism independent of the D3 defect:

| Check | Result |
| --- | --- |
| Long compound ("Unternehmensnachfolge", 22 chars) in a `288px` box, `lang="de"` | pass — wrapped to 2 lines (`115.1875px` = `2 × 57.6px` line-height); `overflow-wrap`/`word-break` both `normal`, so the break can only be `hyphens: auto` acting on a single unbroken word |
| Same heading, `lang` removed from the ancestor | pass — back to 1 line (`57.59px`); `scrollWidth − clientWidth = 293px`, i.e. the compound now overflows instead of breaking — hyphenation is fully `lang`-dependent as D8 states |
| Short word ("unsere", 6 chars, under the `14`-char `hyphenate-limit-chars` floor), `lang="de"`, `40px` box | pass — stayed on one line (`57.59px`), overflowed by `121px` rather than hyphenating — **Chrome 150 honours `hyphenate-limit-chars: 14 5 5`, keeping short words whole** |

Record only for this engine: Chrome 150 respects the `14`-character floor.
Firefox added `hyphenate-limit-chars` in 137 per D8; no Firefox build was
available here to compare, so whether Firefox 137+ shows the same short-word
behaviour, and what pre-137 Firefox or Safari do (`hyphens: auto` alone, so
short words *will* break there per D8's own prediction), is unobserved.

**Unobserved, explicitly:**

- Real Safari and Firefox, any version. Everything above is single-engine
  (Chrome 150). D8 already predicts different `hyphenate-limit-chars`
  behaviour pre-Firefox-137 and in Safari; unconfirmed.
- A real screen-reader session over the restored semantics (list markers,
  table headers, link underlines) — this run inspected computed CSS and
  geometry only.
- The clamp scale's actual viewport-responsiveness (`clamp()` moving between a
  narrow and wide viewport): not measurable here, because `window.innerWidth`
  did not respond to `resize_window` in the automated tab, and because the
  font-size never applies at all per the defect above — there is nothing to
  watch move until that is fixed.
- Whether the defect's severity differs for a consumer whose own stylesheet
  happens to declare *any* rule for `h1`–`h6`, `ul`/`ol`, or `a` in `@layer
  base` with non-zero specificity (as the brief's own fixture does) — such a
  consumer's rule would beat preflight the same way the fixture's did, which
  would incidentally beat our rule too and mask the defect in that specific
  project without fixing it.

**Verdict: fails the check this task exists to run.** D3's premise — that the
package's rules are "a floor a project can step over" — requires the floor to
exist by default first. Measured on a compiled Tailwind 4.3.3 fixture and the
real Storybook build, in Chrome 150, it does not: `:where()`-wrapped
selectors in `@layer base` lose to Tailwind's own preflight selectors in the
same layer whenever preflight uses a plain type selector (`h1`–`h6`, `ul`,
`ol`, `menu`, `a`), because cascade layers do not adjudicate ties within one
layer — specificity does, and `:where()` was chosen specifically to make ours
zero. The rules that survive are exactly the ones where preflight's
competing selector also happens to be zero-specificity (`*`, adjacent-sibling
combinators). Nothing in this run was adjusted to make a check pass; this is
reported, not fixed.

## Risks and open questions

- **D3's zero-specificity rules lose to Tailwind's own preflight by default,
  with no project CSS involved.** See Verification. `h1`–`h6` sizing, list
  markers (top-level and nested), and link colour/underline all fail to apply
  out of the box; only the rules competing against preflight's `*`-scoped
  resets (tables, `hr`, `blockquote`, flow spacing, measure) survive. This
  needs a decision before merge: either the affected selectors need enough
  specificity to beat preflight's plain type selectors while staying beatable
  by an ordinary project rule (a form of `:where()` that isn't fully zero, or
  moving just those selectors out of competition with preflight some other
  way), or D3 has to be re-scoped to state plainly that the defaults only take
  effect once a project has *any* competing rule for that element — which
  contradicts D2's "works with no project setup."
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
