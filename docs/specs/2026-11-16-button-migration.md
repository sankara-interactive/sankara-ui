# `Button` migration — Design

Date: 2026-11-16
Status: draft, pending review
Scope: step 1 of the migration order in `2026-09-28-two-layer-direction.md`.
Moves `Button` to an exported variant definition and a factory, and sets up
what every later migration reuses: `src/variants/`, the merge-backed `cn`, the
self-registering `@source`, and the test that proves it reaches a consumer.

Behaviour does not change. D2–D4 of `2026-08-03-button-design.md` (`render`,
`disabled` on a real `<button>` only, a rendered `<button>` is a button) carry
over unchanged, as do the dev-mode errors. Only how classes get onto the element
changes.

## Amendment to the direction spec

**One styling peer, not two.** The direction spec makes `tailwind-variants`
and `tailwind-merge` required peers, checked against `tailwind-variants` 3.3.1.
Version 4 (4.0.0, 2026-10-29) has no dependencies or peers. It bundles its own
merge engine, and `tailwind-variants/config` exports `extendTailwindMerge`,
`mergeConfigs` and `createTV` with the same config shape as `tailwind-merge`.
Checked 2026-11-16 with 4.0.2 and `tailwind-merge` uninstalled:
`extendTailwindMerge({ extend: { theme: { radius: ['card'], shadow: ['card'] } } })`
merges `rounded-card shadow-card rounded-none shadow-none` to
`rounded-none shadow-none`.

So the peer list becomes `tailwind-variants: ^4.0.0`, and `tailwind-merge` is
not added. `@base-ui/react` is added with `Dialog`, the first component built on
it — a peer nothing imports is install friction for no reason.

## Decisions

### D1 — `buttonVariants` carries structure only

Old D1 holds: five projects, five unrelated skins, no shared visual language.
The stock definition is today's structural rules, moved from `tokens.css` into
utilities, with no variants:

```ts
// src/variants/button.ts
import { tv } from 'tailwind-variants'

export const buttonVariants = tv({
  base: [
    'inline-flex items-center justify-center gap-2 cursor-pointer no-underline',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  ],
})
```

A project adds its own `intent`, `size` and anything else through `extend`
(see the direction spec's example). The README shows a two-intent example built
on the role tokens, as documentation, not as a default.

`disabled:` styling stays out for the same reason: what a disabled button looks
like is skin.

### D2 — `createButton(definition, options?)`

```ts
export function createButton<D extends ButtonDefinition>(
  definition: D,
  options?: { twMergeConfig?: ConfigExtension },
): (props: ButtonProps & VariantProps<D>) => ReactElement

export const Button = createButton(buttonVariants)
```

- Variant props are split from the rest by `definition.variantKeys` (checked:
  an extended definition lists its own keys plus the base's), so `intent` never
  reaches the DOM.
- The class string is `merge(definition(variantProps), renderProps.className,
  className)` — the render element's classes, then the caller's, both able to
  override a variant class. Same order as today.
- `Button.tsx` keeps no `'use client'`, and nor does the factory's return. A
  project module calling `createButton` is a server module unless it adds the
  directive itself.

**Why the factory merges, not the definition.** The merge config does not
survive `extend`. Checked 2026-11-16: a base defined with `twMergeConfig` merges
`rounded-card` + `rounded-none` correctly; `tv({ extend: base, … })` falls back
to the default merger and keeps both, whether the extending `tv` comes from the
default or the `/config` entry. So the definition can't be trusted to carry it.
The factory always merges the definition's output with the package config, and
a project's `twMergeConfig` is stacked on top
(`extendTailwindMerge(d => mergeConfigs(mergeConfigs(d, pkg), project))`, checked:
both configs' tokens resolve).

### D3 — The merge config is derived from `TOKENS`, not written by hand

The direction spec accepted "a new token is registered in five places". It
doesn't have to be. Every utility-backed token's namespace already says its
merge group:

| Prefix | Merge entry |
| --- | --- |
| `--color-*` | `theme.color` |
| `--radius-*` | `theme.radius` |
| `--shadow-*` | `theme.shadow` |
| `--duration-*` | `classGroups.duration` — `duration` is not a theme key; without the entry, `duration-expand duration-300` keeps both (checked) |

Other `TOKENS` (`--richtext-*`, `--heading-*`, `--carousel-*`,
`--field-accent`) back no utility and are skipped. `src/utilities/merge.ts`
builds the config from `TOKENS` once; a token added to `TOKENS` is merged
correctly with no fifth registration. Deprecated names stay in `TOKENS` until
1.0, so they are covered too.

A test asserts one representative per group (`rounded-card rounded-none` →
`rounded-none`, and likewise for colour, shadow, duration), and that every
`TOKENS` entry is either mapped or on the explicit skip list — the same
"classify every token" rule `band-recipe.test.ts` enforces.

### D4 — `cn` becomes the merge

The exported `cn` switches from a plain join to the package merge function.
Existing callers pass `sankara-*` classes that never conflict, so their output
is unchanged; a consumer using `cn` gets token-aware merging. One function, not
a second `cnMerge` export.

Its signature widens to whatever the merge accepts (strings, falsy values,
nested arrays). Narrowing it back to today's type is not worth a wrapper.

### D5 — The package stylesheet registers its own sources

Classes now live in emitted JS, which Tailwind does not scan in
`node_modules`. The stylesheet points Tailwind at them:

```css
@source "../variants";
@source "../components/Icon.js";
```

The paths are relative to the stylesheet, so `src` and `dist` need the same
shape. Today `copy-styles.mjs` puts `src/styles/tokens.css` at `dist/styles.css`,
one level up. It moves to `dist/styles/tokens.css`, next to the `tokens.js` tsc
already emits there, and the `./styles.css` export points at the new path. The
public specifier `@sankara-ui/core/styles.css` does not change.

The consumer's `@source ".../@sankara-ui/core/dist/components"` line becomes
unnecessary; leaving it in is harmless. The README install block drops it, and
the README's prose about scanning the package root goes with it.

### D6 — Proof on a packed tarball, npm and pnpm

The direction spec asks for a layer-order test "on a packed Next build".
Narrowed, because the layer question has changed shape: variant classes and a
consumer's `className` are both utilities, in the same layer, and the merge
removes the loser before CSS sees it. What can still break is the class never
being emitted — a wrong `@source` path, or pnpm's symlinked layout resolving it
somewhere else.

So the packaging smoke job gains a step, run once with npm and once with pnpm:
install the tarball, compile a stylesheet with `@tailwindcss/cli`, and assert
the button's base classes are in the output. The stylesheet imports Tailwind
with `source(none)`, so only the package's own `@source` can contribute
classes — and a probe script that names the classes can't satisfy the
assertion by being scanned itself.

`@tailwindcss/cli` and Next's `@tailwindcss/postcss` share the engine and the
`@source` resolution; a full Next build adds minutes per run and tests nothing
this doesn't.

### D7 — What leaves `tokens.css`

Checked against the direction spec's "what stays in CSS" list: `.sankara-button`
and `.sankara-button:focus-visible` are plain properties a utility expresses
exactly. Both rules go; nothing Button-related stays. The `.sankara-button`
class is removed from the rendered element.

## Tests

- `button-css.test.ts` is deleted; its assertions move to
  `variants/button.test.ts`: base has the structural classes and the
  focus-ring classes, and nothing decorative (no `bg-`, `text-` colour,
  `rounded-`, `shadow-`, `p-`/`px-`/`py-`, `font-`, `transition`).
- `Button.test.tsx`: the `sankara-button` assertions become assertions on the
  base classes. New cases: a consumer `className` beats a conflicting base class
  (`gap-4` drops `gap-2`); an extended definition's variant prop applies its
  class and does not reach the DOM; a project `twMergeConfig` merges a project
  token (`rounded-pill rounded-none` → `rounded-none`).
- `merge.test.ts` (D3).
- `layer-order.test.ts` drops the button selectors.
- `inline-utilities.test.ts` keeps passing unchanged: `Button.tsx` names no
  classes; they live in `src/variants/`, which the guard doesn't scan. D9 of
  the form spec (a utility default loses half of all overrides) no longer
  applies there because the merge settles the conflict before Tailwind's sort.
- Packaging smoke (D6).

## Release

One minor (0.11.0), changeset marked breaking:

- `.sankara-button` is gone. Anything targeting it — a project stylesheet rule,
  a test selector — needs the classes moved onto `className` or into an
  extended definition.
- New required peer `tailwind-variants@^4`.
- The consumer `@source` line can go.
- `cn` merges conflicting classes instead of keeping both.

The README gains the "migrated components" table the direction spec calls for,
with `Button` as of 0.11.0.

## Out of scope

- `@base-ui/react` as a peer (with `Dialog`).
- Any visual variant in `buttonVariants` (D1).
- Migrating any other component; their `sankara-*` rules and `cn` calls stay.
