# Two-layer architecture — Direction

Date: 2026-09-28
Status: direction agreed in conversation (Base UI as foundation, breaking
changes accepted, exported variant definitions); no component migrated yet
Scope: the package's architecture. Supersedes the "Base UI only where needed,
not a dependency" decision in
`next-storyblok-template/docs/superpowers/specs/2026-07-29-sankara-ui-design.md`
and the matching rules in this repo's `CLAUDE.md`.

## Problem

The original intent was customisable building blocks: the hard behaviour —
dialog, disclosure, slider, combobox, upload, media player, forms — imported
per project and styled per project. What shipped from 0.1 to 0.10 is a third
thing: single styled components configured by props (`Dialog` `size` /
`placement`, `Popover`, `Disclosure`), styled by `sankara-*` classes in the
package stylesheet. Two consequences:

1. **No composition.** There are no parts. A project cannot put its own markup
   between trigger and popup, add a second close button, or restyle the
   backdrop without reaching for a descendant selector.
2. **Customisation stops at the root.** `className` on the outer element plus
   the token palette. A project that needs another button style forks the
   component — the thing a shared package exists to prevent.

## Decision

Two layers, one package.

### Layer 1 — behaviour

**Base UI (`@base-ui/react`) is the headless foundation**, declared as a
**peer dependency** so a consumer mixing our parts with raw Base UI parts has
one copy of each context. (The package was renamed from
`@base-ui-components/react`, now deprecated; 1.8.0 at time of writing.)

We do not re-export Base UI. A project that wants a component fully unstyled
imports `@base-ui/react/<component>` directly; a second name for the same
thing adds nothing.

What this package writes itself in layer 1 is only what neither the platform
nor Base UI covers — current candidates are an upload/dropzone field and a
media player. Each goes through the usual evidence survey before a spec.

Native elements stay where they keep a component a **server component with a
complete keyboard/ARIA contract** — `Disclosure` on `<details>` is the case.
Where a component needs client JavaScript anyway, Base UI replaces the
hand-rolled behaviour: `Dialog`'s own scroll lock and outside-click detection
go.

### Layer 2 — styled

Every styled component mirrors Base UI's part structure with the same part
names (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Popup`, …), so a project can
restyle one part, swap one part for the raw Base UI part, or skip the layer.

Styling lives in **exported `tailwind-variants` definitions** — `buttonVariants`,
`dialogVariants` (with `slots` for parts). A project adds or overrides variants
without copying the component:

```ts
import { tv } from 'tailwind-variants'
import { buttonVariants } from '@sankara-ui/core'

export const button = tv({
  extend: buttonVariants,
  variants: { intent: { ghost: 'bg-transparent text-foreground' } },
})
```

Verified 2026-09-28 against `tailwind-variants` 3.3.1: the extending definition
keeps the base classes and inherited variants and adds the new ones.

Variant classes use the token utilities (`bg-primary`, `rounded-card`), so the
token contract is unchanged: rebranding is still editing a palette.

**Atoms** are the layer-2 components with no Base UI behaviour behind them.
Already shipped and migrating: `Button`, `Heading`, `RichText`, `Field`,
`Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`. Candidates, each
needing two or more surveyed projects before it lands: `Link`, `Badge`,
`Switch`, `Separator`, `Spinner`, `Skeleton`, `Avatar`. "Evidence beats
specification" still binds — a component does not ship because design systems
usually have one.

## Consequences

- **`cn` becomes `tailwind-merge`-backed**, so a consumer's `className` beats
  the variant output it conflicts with. It needs a merge config naming the
  token scales: verified 2026-09-28 that plain `twMerge('rounded-card
  rounded-none')` keeps both classes, and that
  `extendTailwindMerge({ extend: { theme: { radius: ['card'] } } })` keeps only
  the last. The package exports that config (`twMergeConfig`) so a project
  adding tokens extends it rather than rebuilding it. A new token is now
  classified in five places, not four.
- **New dependencies:** `tailwind-variants` and `tailwind-merge` (the former
  peers on the latter, `>=3`). `@base-ui/react` as a peer.
- **`@source` returns for every consumer.** Class strings move from the
  stylesheet into emitted JS, and Tailwind does not scan `node_modules`. All
  class strings live in `src/variants/*.ts`, so the documented directive
  narrows to `.../@sankara-ui/core/dist/variants` — never the package root
  (see the 0.9 observations on `README.md` being scanned).
- **The stylesheet shrinks** to tokens plus CSS for markup the package does not
  render itself: `RichText` prose, the `Heading` base layer, and native-element
  state that has no class hook (`::details-content`).
- **`'use client'`** on every file that renders a Base UI part. `Disclosure`,
  `Heading` and `RichText` stay server components.
- **Every component API breaks.** One minor per migrated component, each with a
  changeset carrying the migration for the template.

## Migration order

1. **`Button`** — smallest surface; establishes `src/variants/`, the
   `tailwind-merge` `cn`, `twMergeConfig`, and the `@source` change.
2. **`Dialog`** — first component on Base UI parts; retires the hand-rolled
   scroll lock and outside-click code.
3. **Form primitives and `Field`** — decide per control between native and
   Base UI (`Field`, `Checkbox`, `Radio`, `Select`).
4. **`Popover`** — native popover API vs Base UI positioning.
5. **`Disclosure`** — stays native; gains parts and variants.
6. **`Carousel`** — no Base UI equivalent; gains variants only.

## Open questions

1. **How an extended definition reaches the component** — a `variants` prop,
   a factory (`createButton(def)`), or a project-side wrapper passing
   `className`. Decided in the `Button` migration spec, where it is cheapest to
   get wrong.
2. **`Popover`**: keep the native popover API (server-friendly, no positioning
   engine) or move to Base UI (anchored positioning, collision handling).
3. **Forms**: Base UI's `Form`/`Field` validation model vs the current
   `fieldWiring`.
