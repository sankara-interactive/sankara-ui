# Two-layer architecture — Direction

Date: 2026-09-28
Status: direction agreed (Base UI as foundation, breaking changes accepted,
exported variant definitions). Revised after external review (Codex,
2026-09-29) and team review (2026-10-04). No component migrated yet.
Scope: the package's architecture. Supersedes the "Base UI only where needed,
not a dependency" decision in
`next-storyblok-template/docs/superpowers/specs/2026-07-29-sankara-ui-design.md`
and the matching rules in this repo's `CLAUDE.md`.

## Problem

The plan was customisable building blocks: shared behaviour (dialog,
disclosure, slider, combobox, upload, media player, forms), styled per project.

What shipped in 0.1–0.9 is something else: finished components configured by
props (`Dialog` with `size` / `placement`, `Popover`, `Disclosure`), styled by
`sankara-*` classes in the package stylesheet. That has two problems:

1. **No composition.** Components have no parts. A project can't put its own
   markup between trigger and popup, add a second close button, or restyle the
   backdrop without a descendant selector.
2. **Customisation stops at the root.** A project gets `className` on the outer
   element and the token palette, nothing more. Needing another button style
   means forking the component — exactly what a shared package should prevent.

## Decision

One package, two layers: **behaviour** and **styling**.

### Layer 1 — behaviour

**Base UI (`@base-ui/react`) is the foundation.** It is a **required peer
dependency** with a normal caret range (`^1.8.0` today; the floor rises when we
use something newer).

- **Required, not optional:** as soon as the barrel (`src/index.ts`) exports a
  component built on Base UI, every consumer imports Base UI. An optional peer
  would make the package fail to load where it isn't installed. (`Icon` sits
  outside the barrel to avoid exactly this with FontAwesome.)
- **Peer, not dependency:** the consumer then has a single copy of Base UI, so
  its React contexts are shared.

We don't re-export Base UI. For a fully unstyled component, a project imports
`@base-ui/react/<component>` directly.

(The package used to be `@base-ui-components/react`, now deprecated.)

**Native elements stay** where they give a server component with full keyboard
and ARIA support out of the box. `Disclosure` on `<details>` is the case:

- It renders on the server and needs no JavaScript.
- The closed content is in the HTML, so search engines and AI crawlers see it.
- It supports both **uncontrolled** (`defaultOpen`) and **controlled** use
  (`open` + `onOpenChange`, wired to the native `toggle` event). It stays a
  server component; only a controlled caller needs to be a client component.
- Parts: `Root`, `Summary`, `Panel`.

Where a component needs client JavaScript anyway, Base UI replaces our own
behaviour code. Example: `Dialog`'s scroll lock and outside-click handling go.

**Our own behaviour code** is only for what neither the browser nor Base UI
covers. Shipped: `Carousel`. Candidates: an upload/dropzone field and a media
player — each needs the usual evidence survey before a spec.

### Layer 2 — styling

Styled components **wrap Base UI parts one-to-one**, with the same names
(`Dialog.Root`, `Dialog.Trigger`, `Dialog.Popup`, …). Each part:

- passes through all props, `ref` and the state-aware `className` of the Base UI
  part,
- adds classes only — no behaviour of its own.

Mixing our parts with raw Base UI parts in one component is not supported.

Styling lives in **exported `tailwind-variants` definitions**: `buttonVariants`,
`dialogVariants` (with `slots` for the parts). A project extends a definition
and passes it to the component's **factory**:

```ts
import { tv } from 'tailwind-variants'
import { buttonVariants, createButton } from '@sankara-ui/core'

export const Button = createButton(
  tv({
    extend: buttonVariants,
    variants: { intent: { ghost: 'bg-transparent text-foreground' } },
  }),
)
// <Button intent="ghost"> — typed from the extended definition
```

The stock `Button` is just `createButton(buttonVariants)`.

Why a factory? The two alternatives fall short:

- **A `variants` prop** would pass a function from a server to a client
  component, which RSC doesn't allow (fine for `Button`, breaks `Dialog`).
  TypeScript also can't reliably type `intent="ghost"` from a definition passed
  in the same element.
- **A project wrapper with `className={button({ intent: 'ghost' })}`** works
  with RSC, but loses typed variant props, and every call site picks classes by
  hand. It stays available as an escape hatch.

Call factories at module level. A factory for a Base UI component returns a
client component, so the module calling it needs `'use client'`.

Checked 2026-09-28 with `tailwind-variants` 3.3.1: an extended definition keeps
the base classes and variants and adds the new ones. Variants use the token
utilities (`bg-primary`, `rounded-card`), so the token contract doesn't change —
rebranding is still editing a palette.

**Atoms** are layer-2 components without Base UI behaviour.

- Shipped, to be migrated: `Button`, `Heading`, `RichText`, `Field`, `Input`,
  `Textarea`, `Select`, `Checkbox`, `RadioGroup`.
- Candidates, each needing two or more surveyed projects: `Link`, `Badge`,
  `Switch`, `Separator`, `Spinner`, `Skeleton`, `Avatar`.

"Evidence beats specification" still applies: we don't add a component because
design systems usually have one. `Button` stays a native server component; it
doesn't move to Base UI's `Button` just for consistency.

### Popover

Moves to **Base UI**, with parts `Root`, `Trigger`, `Portal`, `Positioner`,
`Popup`, `Close`. The current native version isn't really server-friendly —
`Popover.tsx` is already `'use client'` (for `useId`, trigger cloning and
closing on link click) — and without CSS anchor positioning it falls back to a
bottom sheet. Base UI's `Positioner` gives anchoring, flipping/shifting at the
viewport edge, and logical placement.

### Forms

- **`fieldWiring` stays** as the server-rendered base: label, description and
  error markup for native controls and server-action errors, no client code.
  Its `id ?? name` collision gets fixed during the migration.
- A **client form layer** on Base UI (`Form`, validated fields) is a separate
  component, added when a project needs interactive validation. Server and
  client validation don't mix inside one `Field`.

## Consequences

- **No more `@source` line for consumers.** Classes move from the stylesheet
  into the emitted JS, and Tailwind doesn't scan `node_modules`. But an
  `@source` inside the package's own `styles.css` resolves relative to that
  file, so the package can register itself.
  Checked 2026-09-29 with `@tailwindcss/postcss`: a class only in
  `node_modules/pkg/dist/variants/*.js` is missing without the directive and
  present with `@source "./variants"` in the package stylesheet. This also
  covers `Icon` (`@source "./components/Icon.js"`). Still to check in the
  packaging smoke test: pnpm's symlinked layout.
- **`cn` uses `tailwind-merge`**, so a consumer's `className` wins over a
  conflicting variant class. It needs a config that knows our token names:
  plain `twMerge('rounded-card rounded-none')` keeps both, while
  `extendTailwindMerge({ extend: { theme: { radius: ['card'] } } })` keeps only
  the last (checked 2026-09-28).
  - The config covers every token group: colour, radius, shadow, duration.
  - Factories take an optional merge config, so a project that adds tokens can
    extend it. Exporting the config alone isn't enough — the stock components
    would keep using the package's own.
  - A new token is now registered in five places instead of four.
- **`className` overrides are part of the contract** (decided 2026-09-29): a
  consumer's `rounded-none` beats the package's `rounded-card`. The alternative
  — restyle only through variants, `className` only adds — would need neither
  library, and was declined. With `tailwind-merge` in, `tailwind-variants` adds
  little and gives us the typed `extend` the factories need.
- **`tailwind-variants` and `tailwind-merge` are required peers.** Projects
  extend our definitions and merge config, so both sides must use the same copy.
  Caret ranges, matching the dev dependencies, listed in the install block.
- **`'use client'` only on small per-part modules** for Base UI parts, never on
  a whole namespace module. `Disclosure`, `Heading`, `RichText`, `Button` and
  `fieldWiring` stay server components.
- **The stylesheet shrinks, by rule.** Whatever a utility class expresses
  exactly moves to variants. What stays in CSS:
  - tokens and `@property` registrations, keyframes
  - pseudo-elements (`::details-content`, `::backdrop`)
  - state and browser-fallback selectors, reduced-motion rules
  - styling for markup we don't render (`RichText` prose, the `Heading` base
    layer)

  Each migration spec checks its component's rules against this list.
- **Layer order is tested.** "Consumer `className` wins" only holds if the
  package CSS lands in the CSS layer the install block says. We document one
  import setup and verify it with a packed Next/Tailwind build before the first
  migrated component ships.
- **Every component API breaks.** One minor release per migrated component, each
  with a changeset describing its migration. The README tracks which components
  are migrated as of which version. A component's old `sankara-*` selectors are
  removed in the release that migrates it.

## Migration order

1. **`Button`** — smallest surface. Sets up `src/variants/`, the factory, the
   `tailwind-merge` `cn` and its config, the self-registering `@source`, and
   the layer-order test.
2. **`Dialog`** — first component on Base UI parts; drops our own scroll lock
   and outside-click code.
3. **`Popover`** — moves to Base UI.
4. **Form primitives and `Field`** — variants; `fieldWiring` collision fix.
5. **`Disclosure`** — stays native; gains parts, controlled mode and variants.
6. **`Carousel`** — no Base UI equivalent; gains variants only.
