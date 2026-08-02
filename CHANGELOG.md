# @sankara-ui/core

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
