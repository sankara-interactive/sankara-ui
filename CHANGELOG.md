# @sankara-ui/core

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
