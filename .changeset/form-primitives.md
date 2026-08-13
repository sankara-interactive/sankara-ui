---
'@sankara-ui/core': minor
---

Add the form primitives: `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`
and `Select`.

All six are server components — the id derives from the required `name` prop
rather than `useId`, so a page with a form ships no JavaScript from this package.
Pass `id` explicitly when two forms on one page share a field name.

They are form-library agnostic by construction: every unconsumed prop is
forwarded to the native element, and rest props override the derived `id`,
`aria-describedby` and `aria-invalid`. react-hook-form's `register()`, conform's
`getInputProps()`, and plain native forms all work without an adapter.

Two new tokens: `--color-error` and `--field-accent`.

Unlike `Button`, `Dialog` and `Popover`, the form controls ship a visible surface
— Tailwind preflight zeroes `border-width`, so a control with no default is
invisible rather than merely unstyled. It is built from `--color-surface`,
`--color-muted` and `--radius-card` in `@layer components`, so any consumer
utility overrides it.
