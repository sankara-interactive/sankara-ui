# `Disclosure` — Design

Date: 2026-08-01
Status: draft, revised after external review; approval gated on the browser/AT
matrix in Risks
Scope: Tier 2 of `next-storyblok-template/docs/enhancement-roadmap.md`, first component

## Problem

Four of the five surveyed projects ship an FAQ-style expand/collapse. Each wrote
its own open/close animation, and no two agree: `grid-template-rows: 0fr↔1fr`,
`::details-content` + `interpolate-size`, and a Web Animations API height ramp.
Two are client components for no reason other than rotating a chevron.

## Evidence base

| Project | Component | Mechanism | Boundary | Exclusive | Animation | Microdata |
| --- | --- | --- | --- | --- | --- | --- |
| numbers.ch | `Expandable`, `FaqAccordion` | `<button aria-expanded>` | client | via state | `grid-template-rows` | no |
| fgpfister.ch | `FaqItem` | `<details>/<summary>` | **server** | `<details name>` | `::details-content` | no |
| fairmed.ch-sb | `AccordionGroup` | `<details>/<summary>` | client | no | none (chevron only) | schema.org |
| nuwa.swiss | `accordion_item` | `<details>/<summary>` | client | no | WAAPI height ramp | schema.org |
| brillen-werk.ch | — | — | — | — | — | — |

Five findings, two of which change the plan:

1. **Three of four are already native `<details>`.** Only numbers.ch hand-rolls
   the button, and it is the one implementation that has to declare
   `aria-expanded` by hand.
2. **fgpfister's is a server component with a full open/close transition and a
   working exclusive accordion, and it ships zero JavaScript** — `<details name>`
   plus a CSS utility, quoted verbatim under D4. This exists in production today.
3. **The client boundary in fairmed and nuwa is accidental.** Both are `'use client'`
   only to rotate a chevron and animate height; nuwa additionally calls
   `preventDefault()` on the summary click and re-drives `open` from React state.
   Both effects are reachable in CSS from `group-open:` and `::details-content`.
4. **`ShowMore` and `ExpandableTableRows` are not disclosures.** The roadmap lists
   them under Disclosure, but they reveal *more items in a list*, keep no
   expanded/collapsed relationship between a trigger and a region, and have no
   ARIA disclosure semantics. Different component, out of this spec.
5. **numbers.ch's `Expandable` renders body-less rows as static pills.** That is
   the site's visual language, not shared mechanics. Out.

## Decisions

### D1 — Native `<details>/<summary>`, not Base UI

This deviates from the design spec's D3, which assumed Disclosure would be the
first Base UI Collapsible/Accordion consumer.

The decision is *prefer zero JavaScript and platform behaviour over application
control* — not "native supplies everything Base UI would". Native gives the
trigger/region relationship, the exposed expanded state, the `Enter`/`Space`
contract, find-in-page expansion of collapsed content, and exclusive grouping via
`name`, with no dependency and no client boundary. Base UI would additionally
give controlled `open`, change callbacks, disabled items, explicit
trigger/panel composition with state attributes, easier bespoke animation, and
its own `hiddenUntilFound` handling — all of which cost a client component.

For an FAQ list, the estate has already voted: three of four are native, and the
fourth is the outlier that had to wire ARIA by hand.

Accepted trade-offs: no controlled `open` prop (native owns the state after
mount); no orchestrated transition when an exclusive group closes a sibling; and
the animation depends on `::details-content`, which is newer than anything else
the package requires (see Risks).

### D2 — Server component

No `'use client'`. Consumers keep the subtree on the server, and the spec's
"a blanket client boundary must not survive extraction" rule is honoured by
construction rather than by discipline.

### D3 — Exclusive grouping via a caller-supplied `name`; no `DisclosureGroup`

The earlier draft had a `DisclosureGroup exclusive` that generated a `name` with
`useId` and passed it to its children. That cannot exist under D2: `useId` is a
hook and React context is unavailable in server components, so the group would
have to be a client component, and `cloneElement` over children breaks the moment
one is wrapped in a fragment or a caller's own component.

`name` is therefore a plain prop on `Disclosure`, supplied by the caller from a
stable content id — exactly what fgpfister does today
(`faq-${blok._uid}-${suffix}`). Consequences to document:

- `name` groups `<details>` **document-wide**, not within a subtree. Two unrelated
  accordions sharing a name silently couple; derive it from a content id.
- HTML forbids an empty `name`, and permits only one initially-open member per
  group. `defaultOpen` on two same-named items is invalid markup with
  browser-defined behaviour; the component does not police it.

Omitting `name` gives independently-open items, which is what three of four
projects do.

### D4 — Animation is CSS, off under reduced motion, degrading to instant

Ported from fgpfister's `details-animated` utility:

```css
@utility details-animated {
  interpolate-size: allow-keywords;

  &::details-content {
    block-size: 0;
    overflow-y: clip;
    opacity: 0;
    transition:
      block-size 0.5s ease-in-out,
      opacity 0.5s ease-in-out,
      content-visibility 0.5s allow-discrete;
    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
}
```

Three things about this that the first draft glossed over:

- `interpolate-size: allow-keywords` does not generally animate intrinsic sizes.
  It opts in to interpolation where one endpoint is a length and the other an
  intrinsic keyword — which is exactly the `0` → `auto` case here, and nothing
  more.
- The close transition depends on `content-visibility` being transitioned with
  `allow-discrete`, because the UA controls that property on `::details-content`.
- Safari renders a disclosure marker that CSS must remove explicitly
  (`[&::-webkit-details-marker]:hidden`), alongside `list-style: none`.

Where `::details-content` is unsupported the component opens and closes
instantly. That is only acceptable if the collapsed content stays reachable, so
no rule may hide it on the unsupported path — the base styles must not set
`display: none` or a fixed `block-size` outside the `::details-content` block.

### D5 — Indicator is caller-supplied

The package ships no icon set, so it cannot default to a FontAwesome chevron.
`indicator` takes a `ReactNode`, defaults to a CSS-drawn chevron using existing
tokens, and the root carries `group` so a caller can express both estate
patterns without new API: rotation (`group-open:rotate-180`) and plus/minus swap
(`group-open:hidden` / `hidden group-open:block`).

### D6 — No content wrapper element

`<details>` renders `<summary>` and then `children` directly. `::details-content`
targets the pseudo-element, so an intermediate `<div>` buys nothing — and its
absence is what makes microdata work with no API at all: the caller's own element
carries `itemProp`/`itemScope`, as fairmed and nuwa already write it. Panel
padding is the caller's element too.

## API

```tsx
<Disclosure
  name={`faq-${section.id}`}
  summary={<h3 itemProp="name">Wie lange dauert ein Projekt?</h3>}
>
  <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
    …
  </div>
</Disclosure>
```

`Disclosure` extends `ComponentPropsWithoutRef<'details'>`; unlisted props and
`ref` land on the `<details>` root, which is how `itemScope`/`itemType` get
there.

- `summary: ReactNode` — required. Caller-supplied, so heading level and any
  `itemProp` stay the caller's (see Accessibility on heading semantics).
- `children: ReactNode` — the disclosed region, rendered directly.
- `defaultOpen?: boolean` — maps to the `open` attribute. Uncontrolled after
  mount, by D1.
- `name?: string` — exclusive grouping, per D3.
- `indicator?: ReactNode`
- `className?: string` — root.
- `summaryClassName?: string` — the projects' summary chrome differs materially
  (border-t vs. card vs. bare row), and root-only styling cannot reach it.

Not included, because each one forces a client boundary and defeats D2:
`onToggle`, controlled `open`, `disabled`.

## Accessibility

- **Heading semantics are not guaranteed.** A heading nested inside `<summary>`
  may have its role suppressed by summary's own role in some browser/AT
  combinations. Two production sites accept this, so it is not a blocker, but the
  README must say so and recommend a heading *outside* the `<details>` where
  heading navigation matters.
- **No interactive controls inside `summary`.** Buttons or links nested in the
  trigger are not supported; native activation semantics do not survive it.
- Focus visibility, forced-colors mode, and high zoom are part of the manual
  check, not assumed.

## Tokens

One addition to the contract: `--duration-expand`. The three projects animate at
0.32s, 0.5s and 300ms — a value that visibly differs per brand is what the token
contract is for. Everything else reuses `--color-muted` (divider, indicator) and
`--color-on-surface`. Adding it means the usual three places: `TOKENS`,
`tokens.css`, README table.

## Testing

Vitest, on what can actually break:

- `name` reaches the `<details>` element; omitting it emits no attribute.
- `defaultOpen` emits the `open` attribute; omitting it does not.
- Toggling via `userEvent.click` on the summary flips `open`.
- The default indicator renders; a supplied one replaces it.
- Unlisted props and `ref` land on the root (the microdata path).
- `children` render as direct content, with no wrapper element (D6).

Not testable in jsdom, and stated rather than faked: `::details-content`
transitions, `interpolate-size`, native exclusive close, find-in-page expansion,
and the Safari marker. Those are Storybook stories plus the real-browser matrix
below.

## Risks and open questions

- **The browser/AT matrix is an approval gate, not an open question.** Before
  this is the only animation path, verify against the estate's targets:
  `::details-content` (Safari 18.4+), `interpolate-size` (still limited per MDN),
  `<details name>`, the unsupported-path fallback actually showing content, the
  Safari marker, and heading announcement in at least one screen reader.
- **Schema.org FAQ microdata** is a current need in fairmed and nuwa, not a
  future one. D6 plus root prop spreading covers it without a `faqSchema` flag;
  confirm against both sites' markup during implementation.
- **Base UI has no consumer left in this tier's first component.** If Dialog,
  Popover and Menu also land on native elements, D3 of the original design spec
  should be reopened rather than left as an unused decision.
- **Exclusive close is un-animated** in current engines as far as fgpfister's
  production code shows. This is an observation from one shipping site, not a
  browser matrix; confirm rather than assert.

## Non-goals

- `ShowMore` / progressive list reveal — separate component, own spec.
- Controlled `open` state and imperative open/close.
- Nested disclosures.
- numbers.ch's pill rows and its per-row background ramp.
