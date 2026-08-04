# `RichText` — Design

Date: 2026-08-04
Status: draft, pending implementation
Scope: Tier 3 of `next-storyblok-template/docs/enhancement-roadmap.md`, first half
of the typography work — `Heading` is a separate spec

## Problem

Every project renders CMS rich text, and every project styles it with a
hand-written class. The reason is not preference: Tailwind's preflight removes
list markers, heading sizes and margins from every element, so rich text — the
one kind of markup a consumer does not author — arrives as an undifferentiated
grey wall unless something puts the semantics back.

Four projects wrote that class themselves, in three different files and two
different languages. The fifth reached for `@tailwindcss/typography` instead.

## Evidence base

| Project | Rich text styling | Where |
| --- | --- | --- |
| brillen-werk.ch | hand-written `.richtext` | `styles/globals.css` |
| fgpfister.ch | hand-written `.richtext` | `styles/globals.css` |
| fairmed.ch-sb | hand-written `.richtext` | `styles/typography.scss` |
| nuwa.swiss | hand-written `.richtext` | `styles/base/typography.scss` |
| numbers.ch | `@tailwindcss/typography` | plugin |

Five findings:

1. **The structural core is already agreed.** fgpfister and brillen-werk both
   open with the same rule, character for character:

   ```css
   .richtext { & > :not(:last-child) { @apply mb-4 } }
   ```

   Both then style `a`, `ul`/`ol` and `li` with the same structure and different
   values. The estate has independently converged on one shape.

2. **The call site is identical too.** brillen-werk and fairmed both write:

   ```tsx
   <div className="richtext">
     <RichTextRenderer text={blok.text} />
   </div>
   ```

   A wrapper element carrying the class, with the project's own CMS renderer
   inside. Whatever ships must wrap children and must never touch Storyblok.

3. **Per-project list variants exist and stay put** — `.feature-list` in
   brillen-werk, `.-pros-list` and `.-cons-list` in fgpfister, each with its own
   marker treatment. These are brand vocabulary, not shared structure.

4. **Tables are a latent bug.** No project styles `table` inside rich text, but
   `table` appears 14 times across the generated Storyblok schemas — the field
   type is live and an editor can insert one today. Preflight strips borders and
   spacing, so that table renders broken and no project would catch it.

5. **`code`/`pre` has no footprint at all** — not in any stylesheet, and
   `code_block` appears in no schema in the estate. These are marketing sites for
   SMEs.

## Decisions

### D1 — Our own contract, not `@tailwindcss/typography`

The plugin's value is mostly appearance: a full type scale, colours, spacing and
`max-width: 65ch`. That is the part every project in this estate overrides, and
the part this package has spent four components refusing to ship. Its reputation
for being awkward to override is the same complaint from the other direction.

Four of five hand-rolled roughly thirty lines instead. This ships those thirty
lines once, with the values behind tokens.

Accepted trade: element coverage is ours to maintain, and CMS output can contain
more than the estate uses today. D3 bounds that.

### D2 — Restoring semantics is not shipping appearance

`Button` ships no colours, radius or padding because a consumer authors every
button and would override all of it. Rich text is the opposite case: nobody
authors it, preflight has stripped it, and a package that leaves it bare leaves
it unreadable.

So `RichText` does set sizes, markers and spacing — enough that it works with no
project setup at all. Every value is a token, and the whole block sits in
`@layer components`, so a project's own `@layer base` heading rules and any
Tailwind utility both win without `!important`. The default is a floor, not an
opinion.

### D3 — What is covered, and what is not

Covered: the flow rhythm between blocks, `h2`–`h4`, `ul`/`ol`/`li`, `a`,
`table`/`th`/`td`, and `hr`.

`table` is included on the strength of finding 4 — a live schema field that
renders broken today.

Not covered:

- **`figure`/`figcaption` and `blockquote`.** Both are nested bloks with their
  own components in the surveyed projects; styling them from inside rich text
  would fight the component that owns them.
- **`code`/`pre`.** No footprint anywhere (finding 5). Five lines to add the day
  a project needs them; the same rule that kept `Menu` and `variant` props out.
- **`h1`.** A rich text field is body content inside a page that already has its
  title. Page-level headings are the `Heading` spec.

### D4 — Both a class and a component

The class is the artifact; the component is ergonomics.

```tsx
<RichText>
  <RichTextRenderer text={blok.text} />
</RichText>
```

renders `<div class="sankara-richtext sankara-richtext-measure">`. Consumers who
already have a wrapper can use the class directly, which is what all five do
today, and the README documents both.

The component earns its place with one decision: whether the measure applies
(D5). A `measure={false}` prop reads better than remembering a second class
name. It is a server component — no hooks, no handlers.

Rejected: component-only, which forces a wrapper on people who have one and
double-wraps a CMS renderer that emits its own root.

### D5 — Measure is a modifier, on by default

`max-inline-size: var(--richtext-measure)` lives on `.sankara-richtext-measure`,
not on the base class, so the constraint can be dropped without unpicking the
rest.

Default `68ch`. On by default because unbounded body copy across a wide viewport
is the more common defect; inert inside a card narrower than the measure, where
brillen-werk's rich text usually sits.

### D6 — Hyphenation, and the `lang` dependency it hides

Ported from fgpfister, the only project that solved it:

```css
hyphens: auto;
hyphenate-limit-chars: 14 5 5;
```

Every site in this estate is German-language, and German compounds
("Unternehmensnachfolge", "Beteiligungsgesellschaft") overflow narrow columns.
Plain `hyphens: auto` also chops short words — "un-sere" — so the limit keeps
anything under fourteen characters whole.

Applied to headings inside rich text, matching fgpfister's scope (`h1, h2, h3`
and `.richtext.font-display`), not to body paragraphs, which is a larger
typographic decision no project in the estate has taken.

**The dependency that must be documented:** `hyphens: auto` does nothing without
a `lang` attribute on an ancestor. fgpfister's own comment says "html carries
lang", which is why theirs works. The component cannot set it — the content's
language is the consumer's — so the README states it, or the feature silently
does nothing and nobody knows.

### D7 — Flow spacing via the owl selector

```css
& > * + * { margin-block-start: var(--richtext-flow) }
```

Equivalent to the estate's `& > :not(:last-child) { margin-bottom }`, with no
trailing margin to strip and no margin outside the container's first and last
child. Logical property, so it follows writing mode.

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
- `className` merges after the component's own, and `ref` and every other prop
  reach the `<div>` — under React 19 `ref` is an ordinary prop, as in
  `Disclosure`.
- No `as` prop. A consumer who needs `<article>` uses the class directly.

## Tokens

Five added, each in `TOKENS`, the `@theme` block and the README table:

| Token | Default | Purpose |
| --- | --- | --- |
| `--richtext-flow` | `1rem` | Vertical rhythm between blocks |
| `--richtext-measure` | `68ch` | Line length when the measure applies |
| `--richtext-h2` | `clamp(1.5rem, 1.2rem + 1.4vw, 2rem)` | Fluid `h2` inside body copy |
| `--richtext-h3` | `clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)` | Fluid `h3` |
| `--richtext-h4` | `clamp(1.125rem, 1.05rem + 0.4vw, 1.25rem)` | Fluid `h4` |

Links use `--color-primary`; table borders and `hr` use `--color-muted`. No new
colour tokens.

## Testing

A stylesheet contract test, in the shape of `src/styles/button-css.test.ts`:

- Each covered element from D3 has a rule, and the rule sets what it claims.
- The five tokens are declared with defaults, and `tokens.test.ts`'s existing
  contract test covers their presence in `TOKENS`.
- Everything sits inside `@layer components` — covered by the existing layering
  invariant in `tokens.test.ts`.
- The measure lives on the modifier class, not the base class.
- The flow rule uses `margin-block-start`, not a physical property.
- `hyphenate-limit-chars` accompanies every `hyphens: auto`.

Component tests:

- Renders a `<div>` with `sankara-richtext`.
- `sankara-richtext-measure` present by default, absent with `measure={false}`.
- Children render; the component adds no wrapper of its own around them.
- `className` merges rather than replaces; rest props and `ref` reach the div.

Each assertion proven by mutation: break the line it covers, watch that test fail
by name, restore.

Not testable in jsdom, and stated rather than faked: hyphenation, `clamp()`
resolution, `ch` units, table borders, and the marker restoration — jsdom
computes no layout and ships no UA stylesheet worth trusting. All of it belongs
in the browser pass.

## Browser verification

Unusually load-bearing here, because almost nothing above is observable in
jsdom. The pass must confirm:

- A long German compound actually breaks at a narrow measure, and a short word
  does not.
- Removing `lang` from the ancestor stops hyphenation — proving D6's documented
  dependency is real rather than assumed.
- List markers and indents are visible, tables have borders, `hr` renders.
- The clamp scale resolves and moves between a narrow and a wide viewport.
- The measure applies at `68ch` and is absent with `measure={false}`.
- A project's own `h2` rule in `@layer base` still wins over ours.

## Risks and open questions

- **`ch` is font-relative**, so `68ch` is a different physical width in every
  brand's typeface. It is the right unit for a measure, but the default will not
  look identical across projects, and a project with a wide face may want a
  smaller number. The token exists for exactly that.
- **The clamp defaults are the least evidence-backed part of this spec.** No two
  projects agree on a type scale, so these are chosen to be reasonable rather
  than derived. They are a floor for projects with no heading rules, and they
  yield to any project that has them.
- **`hyphenate-limit-chars` support is narrower than `hyphens`.** Browsers
  without it fall back to plain `auto`, which is fgpfister's documented
  behaviour and acceptable — the failure mode is an over-eager break, not
  overflow.
- **Element coverage will drift.** Storyblok's rich text can grow node types,
  and D3's list is what the estate uses today. The browser pass should be
  re-run against a realistic blob whenever a project enables a new node type.

## Non-goals

- Rendering Storyblok documents. Prohibited by CLAUDE.md, and the template
  already owns `RichTextRenderer`.
- `figure`, `figcaption`, `blockquote`, `code`, `pre` — per D3.
- Page-level heading scale and the semantic/visual split (`<h2>` that looks like
  an `h1`) — the `Heading` spec.
- Replacing the projects' `.richtext` classes or their list variants. This
  composes with them.
- `@tailwindcss/typography` compatibility or a migration path from it. numbers.ch
  can keep the plugin; nothing here conflicts with it.
