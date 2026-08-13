# @sankara-ui/core

## 0.9.0

### Minor Changes

- e84badc: Make the `className` escape hatch reliable on `Carousel`, `Disclosure`, `FaIcon`
  and `Dialog` (the form spec's D9 follow-up).

  All four spelled their defaults as Tailwind utilities in JSX, which compile
  into `@layer utilities` — the consumer's own layer. `cn` is a plain join, so
  both classes reached the class attribute and Tailwind's canonical sort decided
  the winner. Measured against a 4.3.3 build: the package's `gap-6` beat a
  consumer's `gap-2` but lost to `gap-8`, and `inline-flex`/`shrink-0` beat `flex`
  and `shrink`. Roughly half of all overrides failed silently.

  Those defaults now live in `styles.css` under `@layer components`, which sits
  before `utilities` in Tailwind's layer order, so any consumer utility wins by
  layer alone — the same guarantee `Button`, `Popover` and the form controls
  already had. New classes: `.sankara-carousel-dots`, `.sankara-disclosure-summary`,
  `.sankara-disclosure-indicator`, `.sankara-fa-icon`. The active carousel dot is
  now sized from `[aria-current='true']` rather than a JSX ternary.

  Consequence worth checking on upgrade: all four now get their layout from the
  stylesheet, so `@import "@sankara-ui/core/styles.css"` is no longer optional for
  them. It was already required by the install instructions and by `Dialog`,
  `Disclosure` and `Popover`.

  `Dialog` is included, with a smaller change than it looks: its `max-w-*` size map
  already survived the sort, but `m-auto`, `ms-auto`, `h-dvh`, `max-h-dvh`,
  `overflow-y-auto` and the `w-[min(…)]` drawer widths did not. Sizes are now
  `.sankara-dialog-sm` / `-md` / `-lg`, meaning a max-inline-size when centred and
  an inline-size when docked to the edge. A consumer who was overriding the drawer
  with `w-*`, `h-*`, `max-h-*`, `overflow-*` or `m-*` gets a different result than
  before — the one they asked for.

  `Icon` keeps its two utilities deliberately, since it ships from the `./icon`
  subpath where the stylesheet may never be imported.

## 0.8.0

### Minor Changes

- 3d07292: Add the form primitives: `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`
  and `Select`.

  All six are server components — the id derives from the required `name` prop
  rather than `useId`, so a page with a form ships no JavaScript from this package.
  Pass `id` explicitly when two forms on one page share a field name.

  They are form-library agnostic by construction: every unconsumed prop is
  forwarded to the native element, and rest props override the derived
  `aria-describedby` and `aria-invalid`, while a form library's own `id` is
  adopted and the label follows it. react-hook-form's `register()`, conform's
  `getInputProps()`, and plain native forms all work without an adapter.
  `RadioGroup` is the exception — its rest props target the `<fieldset>`, not the
  radios, so it does not compose with `register()`.

  Two new tokens: `--color-error` and `--field-accent`.

  Unlike `Button`, `Dialog` and `Popover`, the form controls ship a visible surface
  — Tailwind preflight zeroes `border-width`, so a control with no default is
  invisible rather than merely unstyled. It is built from `--color-surface`,
  `--color-muted` and `--radius-card` in `@layer components`, so any consumer
  utility overrides it.

- 1c8c5bc: Close the three findings from the template's end-to-end integration.

  - `ButtonProps` declares `popoverTarget` and `popoverTargetAction`. Using a
    `Button` as a `Popover` trigger already worked, but only because Popover's
    `cloneElement` injection landed in Button's rest-prop spread — passing either
    attribute directly was a type error, and any future prop filtering would have
    silently stopped the popover opening. The pairing is now part of the API.
  - The anchored `.sankara-popover` panel gets `max-inline-size: calc(100dvw - 2rem)`.
    `width: max-content` ran the panel past the viewport edge on narrow screens;
    `position-try-fallbacks` flips a panel but cannot shrink one wider than the
    screen. `dvw` rather than `vw` so the classic scrollbar is not counted.
  - README documents `StoryblokServerRichText wrapper={false}`. The renderer's
    default wrapper `<div>` breaks `RichText`'s direct-children contract, so
    content renders with no spacing at all and no error.

## 0.7.0

### Minor Changes

- 635b022: Carousel: namespaced classes, token-driven dots, responsive slide widths.

  The root now carries `sankara-carousel`, slides `sankara-carousel-slide`, dots
  `sankara-carousel-dot`. Slide width moved from an inline `flex-basis` into the
  stylesheet, computed from `--carousel-per-view` / `--carousel-gap` (published
  on the root from the props) — override the variable per breakpoint in your own
  CSS for responsive slides. Dot colours moved from hardcoded `bg-primary`/
  `bg-muted` utilities to two new inheritable theme tokens, `--carousel-dot` and
  `--carousel-dot-active`, so a section can retheme its dots contextually.

  Requires the package stylesheet (already mandatory per the install
  instructions): a consumer rendering Carousel without
  `@import '@sankara-ui/core/styles.css'` previously got sized slides from the
  inline style and now gets unsized ones. Defaults are visually unchanged.

  First-consumer evidence: both of numbers.ch's migrated carousels needed
  consumer-side `!important` bridges for exactly these two gaps
  (`docs/specs/2026-08-05-numbers-retrofit-findings.md`).

- 635b022: New `FaIcon`: webfont FontAwesome icon addressed by class-name string, for
  icon names that only exist at runtime — CMS fields where editors type `fa-*`
  names. Emits the `<i>` element a FontAwesome kit styles (the consumer loads
  the kit); a bare glyph name gets `fa-solid` prepended, a non-string or empty
  value renders nothing. No FontAwesome imports, so it exports from the main
  entry with no peer requirements. `Icon` (`@sankara-ui/core/icon`) remains the
  SVG path for code-authored icons.

## 0.6.0

### Minor Changes

- ae22869: Add `Heading`, which splits a heading's semantic level from its visual level:
  `<Heading level={3} visual={4}>` renders `<h3 class="h4">`. Ships `font-size`
  and `line-height` defaults for `.h1`-`.h4` behind four new tokens, on the
  classes only — never the bare `h1`-`h6` tags — so installing it restyles no
  heading you wrote yourself.
- 941ebfa: Add `RichText` — the stylesheet contract that makes CMS output readable after
  Tailwind's preflight strips it, plus the wrapper component that applies it.

  Restores block rhythm, heading sizes and weights, list markers and nesting, link
  underlines, tables, `hr`, inline images and a `blockquote` fallback, behind six
  new `--richtext-*` tokens. Ships in `@layer base` with `:where()` on the
  container class only, so each rule carries the specificity of a bare element
  selector: tied with preflight, and tied with your own bare `h2`. Beaten by any
  class-scoped rule of yours (`.richtext h2`), by any Tailwind utility, and by
  your own bare element rules — the last only because your CSS loads after ours,
  so import `@sankara-ui/core/styles.css` after `tailwindcss` and before your own
  base styles. `h1`–`h4` hyphenate for German compounds, which needs a `lang`
  attribute describing the content.

## 0.5.0

### Minor Changes

- f08d7f4: Add `Button` — a server component that owns button correctness and no
  appearance.

  `type="button"` by default so a button in a form cannot submit it by accident, a
  `render` prop that turns it into a `next/link`, a Storyblok link helper or a
  plain `<a>` without the package depending on either, native `disabled`, and a
  focus ring driven by the new `--color-focus` token. No variants, sizes or
  colours: the surveyed projects share the structure and none of the skin.

### Patch Changes

- 74ef1fc: Ship the `Dialog` and `Disclosure` styles inside `@layer components`.

  Both were unlayered, and an unlayered rule beats every layered rule regardless
  of specificity — including Tailwind's own utilities in `@layer utilities`. A
  consumer's `opacity-*` or `translate-*` class on a `Dialog`, or the equivalent
  on a `Disclosure`, silently lost to the package's own declarations. `Popover`
  already shipped layered; this brings the other two in line, and a test now
  fails if any component rule is added outside a layer.

## 0.4.0

### Minor Changes

- 30ba30d: Add `Popover` — a trigger plus an anchored panel on the native Popover API.

  Light dismiss, `Escape`, the top layer and one-open-at-a-time come from
  `popover="auto"`; positioning is CSS anchor positioning, degrading to a
  full-bleed bottom sheet where it is unsupported. The component adds no wrapper
  element and no ARIA roles, and ships a `popover-open:` Tailwind variant for
  expressing the open state on the trigger.

## 0.3.0

### Minor Changes

- 3594fcd: Move `Icon` to its own entry point and make the FontAwesome peers optional.

  **Breaking for `Icon` users:** `import { Icon } from '@sankara-ui/core'` becomes
  `import { Icon } from '@sankara-ui/core/icon'`. Everything else is unchanged.

  The main entry point re-exported `Icon`, and ESM re-exports are eager, so
  importing anything from `@sankara-ui/core` loaded `@fortawesome/react-fontawesome`
  — which crashed Node in projects that had not installed it, even when no `Icon`
  was rendered. The FontAwesome peers are now declared optional and are only
  resolved by the `./icon` entry point.

  `./styles.css` now points at `dist/styles.css` instead of
  `dist/styles/tokens.css`. The import specifier is unchanged.

## 0.2.0

### Minor Changes

- bd44206: Add `Dialog`, built on native `<dialog>` + `showModal()` — the focus trap,
  Escape, top layer, `::backdrop` and background inertness come from the browser.
  Controlled `open` with an `onRequestClose` request callback, `placement`
  `center`/`end` for modals and side sheets, and `size`. Adds the
  `--color-backdrop` token.
- 2b40bc6: Add `Disclosure`, a server component built on native `<details>`/`<summary>`.
  Exclusive accordions come from the native `name` attribute rather than React
  state, so the component ships no JavaScript. Adds the `--duration-expand` token.

## 0.1.0

### Minor Changes

- 48df9a3: Initial release: `Icon` and `Carousel` components, the `@theme` token contract, and Tailwind v4 styles.
