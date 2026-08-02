---
'@sankara-ui/core': minor
---

Move `Icon` to its own entry point and make the FontAwesome peers optional.

**Breaking for `Icon` users:** `import { Icon } from '@sankara-ui/core'` becomes
`import { Icon } from '@sankara-ui/core/icon'`. Everything else is unchanged.

The main entry point re-exported `Icon`, and ESM re-exports are eager, so
importing anything from `@sankara-ui/core` loaded `@fortawesome/react-fontawesome`
— which crashed Node in projects that had not installed it, even when no `Icon`
was rendered. The FontAwesome peers are now declared optional and are only
resolved by the `./icon` entry point.

`./styles.css` now points at `dist/styles.css` instead of
`dist/styles/tokens.css`. The import specifier is unchanged.
