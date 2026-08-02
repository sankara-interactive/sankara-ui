# @sankara-ui/core

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
