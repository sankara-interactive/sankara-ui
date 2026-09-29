# Two-layer architecture — Direction

Date: 2026-09-28
Status: direction agreed in conversation (Base UI as foundation, breaking
changes accepted, exported variant definitions); revised after external review
(Codex, 2026-09-29); no component migrated yet
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

**Base UI (`@base-ui/react`) is the headless foundation**, a **required peer
dependency** with a tight range. Required, not optional: once the barrel
exports a Base UI-backed component, its eager import needs the package for
every consumer — the failure `Icon` is kept out of the barrel to avoid. A peer,
not a dependency, so the consumer has one copy and one set of contexts. (The
package was renamed from `@base-ui-components/react`, now deprecated; 1.8.0 at
time of writing.)

We do not re-export Base UI. A project that wants a component fully unstyled
imports `@base-ui/react/<component>` directly, within our peer range.

What this package writes itself in layer 1 is only what neither the platform
nor Base UI covers — current candidates are an upload/dropzone field and a
media player. Each goes through the usual evidence survey before a spec.

Native elements stay where they keep a component a **server component with a
complete keyboard/ARIA contract**. `Disclosure` on `<details>` is the case, and
it stays deliberately narrow: uncontrolled, native-specific parts (`Root`,
`Summary`, `Panel`), no claim of Base UI interchangeability. A Base UI
`Collapsible`/`Accordion` lands separately, and only when a project needs
controlled state. Where a component needs client JavaScript anyway, Base UI
replaces the hand-rolled behaviour: `Dialog`'s own scroll lock and
outside-click detection go.

### Layer 2 — styled

Styled components **wrap Base UI parts one-to-one** under the same names
(`Dialog.Root`, `Dialog.Trigger`, `Dialog.Popup`, …): each forwards the
underlying part's full props, `ref`, and state-aware `className`, and adds
classes only — no behavioural defaults on leaf parts. That makes the layer
transparent; it does not make our parts and raw Base UI parts a supported mix,
and the package does not promise one.

Styling lives in **exported `tailwind-variants` definitions** — `buttonVariants`,
`dialogVariants` (with `slots` for parts). A project extends a definition and
binds it with the component's **factory**:

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

The stock `Button` is `createButton(buttonVariants)`. Why a factory, over the
two alternatives:

- **A `variants` prop** passes a function across the RSC boundary — fine for
  `Button`, fatal for `Dialog`. And TypeScript cannot reliably infer
  `intent="ghost"` from a definition passed in the same JSX element.
- **A project wrapper passing `className={button({ intent: 'ghost' })}`**
  keeps RSC compatibility but loses the typed variant props, and every call
  site re-implements selection. It stays as the escape hatch, not the model.

Factories are called at module scope. A factory for a Base UI-backed component
returns a client component, so the project module calling it declares
`'use client'`.

Verified 2026-09-28 against `tailwind-variants` 3.3.1: the extending definition
keeps the base classes and inherited variants and adds the new ones. Variant
classes use the token utilities (`bg-primary`, `rounded-card`), so the token
contract is unchanged: rebranding is still editing a palette.

**Atoms** are the layer-2 components with no Base UI behaviour behind them.
Already shipped and migrating: `Button`, `Heading`, `RichText`, `Field`,
`Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`. Candidates, each
needing two or more surveyed projects before it lands: `Link`, `Badge`,
`Switch`, `Separator`, `Spinner`, `Skeleton`, `Avatar`. "Evidence beats
specification" still binds — a component does not ship because design systems
usually have one. `Button` stays native and a server component; it does not
move to Base UI's `Button` for symmetry.

### Popover

**Base UI**, exposing `Root`/`Trigger`/`Portal`/`Positioner`/`Popup`/`Close`.
The native version's server-friendliness is not real — `Popover.tsx` is already
`'use client'` for `useId`, trigger cloning and link-close — and without CSS
anchor positioning it degrades to a bottom sheet. Base UI's `Positioner` brings
anchoring, collision flip/shift and logical placement.

### Forms

**`fieldWiring` stays** as the server-renderable primitive: label, description
and error markup for native controls and server-action errors, no client code.
Its known `id ?? name` collision is fixed during the migration. A Base UI-backed
client form layer (`Form`, validated fields) is a separate component, added when
a project needs interactive validation — the two validation ownership models do
not mix inside one `Field`.

## Consequences

- **No consumer `@source` line.** Class strings move from the stylesheet into
  emitted JS, and Tailwind does not scan `node_modules` — but an `@source`
  inside the package's own `styles.css` is resolved relative to that file.
  Verified 2026-09-29 with `@tailwindcss/postcss`: a class that only exists in
  `node_modules/pkg/dist/variants/*.js` is absent from the output without the
  directive and present with `@source "./variants"` in the imported package
  stylesheet (`node_modules` gitignored, as in a real project). This retires the
  documented install step, including the one `Icon` needs today (point it at
  `./components/Icon.js`). Still to check in the packaging smoke test: pnpm's
  symlinked layout.
- **`cn` becomes `tailwind-merge`-backed**, so a consumer's `className` beats
  the variant output it conflicts with. It needs a merge config naming the
  token scales: verified 2026-09-28 that plain `twMerge('rounded-card
  rounded-none')` keeps both classes, and that
  `extendTailwindMerge({ extend: { theme: { radius: ['card'] } } })` keeps only
  the last. The config covers every token namespace (colour, radius, shadow,
  duration), and factories take an optional merge config so a project that adds
  tokens extends it — an exported config alone does nothing, because the stock
  components would keep merging with the package's closed one. A new token is
  now classified in five places, not four.
- **`className` overrides are part of the contract** (decided 2026-09-29, ahead
  of a project needing one): a consumer's `rounded-none` beats the package's
  `rounded-card`. The alternative — restyling only through extended variants,
  `className` purely additive — needs neither library below, and was declined.
  Once `tailwind-merge` is in, `tailwind-variants` costs little extra and saves
  hand-writing the typed `extend` the factories depend on.
- **`tailwind-variants` and `tailwind-merge` are required peers.** Extension is
  the core API, so definitions and merge configs cross the package boundary; as
  plain dependencies the package and the project could run different copies.
  Tight ranges, matching dev dependencies, documented in the install block.
- **`'use client'` on the smallest adapter modules**, one per Base UI-backed
  part, not on a compound namespace module. `Disclosure`, `Heading`, `RichText`,
  `Button` and `fieldWiring` stay server components.
- **The stylesheet shrinks, by rule, not by list.** Declarations a utility
  represents faithfully move to variants. What stays in CSS: tokens and
  `@property` registrations, keyframes, pseudo-elements (`::details-content`,
  `::backdrop`), state and browser-fallback selectors, reduced-motion rules,
  and styling of markup the package does not render (`RichText` prose, the
  `Heading` base layer). Each migration spec inventories its component's rules
  against this.
- **Layer order is tested, not assumed.** "Consumer `className` wins" holds only
  if the package CSS lands in the layer the install block puts it in. One
  canonical import arrangement is documented, and a packed Next/Tailwind build
  verifies the cascade before the first migrated component ships.
- **Every component API breaks.** One minor per migrated component, each with a
  changeset carrying that component's migration. The README keeps a table of
  which components are migrated as of which version; the old `sankara-*`
  selectors of a component are removed in the minor that migrates it.

## Migration order

1. **`Button`** — smallest surface; establishes `src/variants/`, the factory,
   the `tailwind-merge` `cn` and its config, the self-registering `@source`,
   and the layer-order test.
2. **`Dialog`** — first component on Base UI parts; retires the hand-rolled
   scroll lock and outside-click code.
3. **`Popover`** — onto Base UI.
4. **Form primitives and `Field`** — variants; `fieldWiring` collision fix.
5. **`Disclosure`** — stays native; gains narrow parts and variants.
6. **`Carousel`** — no Base UI equivalent; gains variants only.
