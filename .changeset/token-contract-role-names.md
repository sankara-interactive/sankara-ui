---
'@sankara-ui/core': minor
---

Colour tokens take shadcn/ui's role names. New: `--color-background`,
`--color-foreground`, `--color-primary-foreground`, `--color-card`,
`--color-card-foreground`, `--color-muted-foreground`, `--color-border`,
`--color-input`, `--color-ring`, `--color-destructive`, `--color-accent`,
`--color-accent-foreground`. Component rules read the new names.

Deprecated, removed in 1.0 — each replacement defaults to `var(<old>)`:
`--color-primary-contrast` → `--color-primary-foreground`, `--color-surface` →
`--color-card`, `--color-on-surface` → `--color-card-foreground`,
`--color-muted` → `--color-muted-foreground`, `--color-focus` → `--color-ring`,
`--color-error` → `--color-destructive`.

Package component defaults are visually unchanged, and an override of a
deprecated name in your `@theme` keeps driving its replacement. Three things can
still change on upgrade: an old name overridden on a selector (`.dark`, a
section class) no longer reaches the components — move it to the new name; the
new names generate new utilities (`bg-card`, `border-border`, …), so a class of
that name already in your markup starts applying; and a theme
that already defines one of the new names with another meaning wins over the
package — djalicunda.com's `--color-input` (a field background) would become the
`Field` border. therapie-im-zentrum's existing `--color-accent` wins the same
way; nothing reads it today, but it becomes the band ground if that site adopts
the recipe.

`DEPRECATED_TOKENS` (old → new) is exported next to `TOKENS`, and `TOKENS`
grows by the twelve new names: code typed against its exact tuple (an
exhaustive `Record<(typeof TOKENS)[number], …>`) needs the new keys. The README's "Themed sections" recipe re-colours every
component inside a band.
