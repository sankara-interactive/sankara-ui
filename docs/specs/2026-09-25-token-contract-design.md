# Token contract — Design

Date: 2026-09-25
Status: design approved in conversation; revised after external review
(Codex, 2026-09-25); not yet implemented
Scope: Phase B2 of `next-storyblok-template/docs/enhancement-roadmap.md`, narrowed
to its first two tasks — the semantic token set and the brand-override rules.
Visual-regression infrastructure stays a separate item; Storybook, the a11y
addon, changesets and CI already exist.

## Problem

The package ships a token contract (`src/styles/tokens.css`), but it grew one
component at a time and has two defects:

1. **Gaps that consumers patch around.** There is no border role: tables, `hr`,
   blockquotes and field controls draw their borders with `--color-muted`, which
   is a *text* colour. There is no page background/foreground pair, and the only
   foreground-on-background pair outside `surface` is `primary-contrast`.
2. **No shared vocabulary.** Names are part Material (`surface`/`on-surface`),
   part ad hoc (`primary-contrast`, `focus`, `error`). Agents and developers
   arriving from shadcn/ui — the reference point for "replaceable tokens" — have
   to learn a private dialect.

Goals, as agreed: (1) a new site rebrands by editing a small palette and every
component follows; (2) components look right without per-site CSS. Stretch:
(3) a section (a dark or accent band) re-colours everything inside it.
Explicit non-goal: light/dark mode — no site in the estate has one.

## Evidence base

`@theme` blocks of the seven Next sites (djalicunda.com, numbers.ch,
fgpfister.ch, therapie-im-zentrum, team.jobs, brillen-werk.ch, project-s):

- **Palettes are named by brand, not role:** `terracotta`, `petrol`, `moss`,
  `brown-50…900`, `lila`.
- **Roles recur under private names:** text ink (`ink`, `body`, `on-surface`),
  page ground (`canvas`, `paper`, `bg`), hairlines (`rule`, `line`,
  `field-border`), `muted`, accent tints.
- **All seven set their own fonts**, display plus body.
- **None has dark mode.** Two have contextual bands: therapie-im-zentrum (dark
  and sand bands), djalicunda (`cta-on-dark`).
- **Consumers of the current names:** djalicunda (`^0.7.0`) and
  therapie-im-zentrum (`^0.9.0`) override `primary-contrast`, `surface`,
  `on-surface`, `focus` and `muted`; djalicunda has 20 `text-muted` usages.

## Decisions

### D1 — shadcn naming

Colour roles take shadcn/ui's names: `x` / `x-foreground` pairs, `border`,
`input`, `ring`, `destructive`. Chosen over extending the existing `x` / `on-x`
convention for recognisability; the cost is a rename, handled by D2.

Not adopted: `popover`, `secondary` (nothing in the estate maps to them) and
shadcn's `muted` background (D4).

### D2 — Rename through aliases, remove at 1.0

0.10.0 adds the new names and keeps every old one. Each new token's default is
`var(<old token>)`, and each old token keeps its current default. Consequences:

- A consumer overriding an **old** name still drives the new one.
- A consumer overriding a **new** name wins outright.
- Old utility classes in consumer markup (`text-primary-contrast`,
  `text-muted`) keep resolving.
- **Package component defaults are visually unchanged**, and a consumer's
  `@theme` override of a deprecated name keeps driving its replacement. This is
  narrower than "the bump is a no-op": new colour names also create new
  utilities (`bg-background`, `border-border`, `ring-ring`, …). Consumer markup
  that already carried such a class — dead until now — would start generating
  CSS. Surveyed: no current site markup does.
- **A consumer can already own a new name with a different meaning.**
  djalicunda defines `--color-input: #fffdfa` as a *field background*
  (`bg-input`); in this contract `input` is the field *border*. Harmless today —
  djalicunda does not use `Field` — but adopting `Field` there would draw
  near-white borders. The changeset calls this out; the fix is a rename on the
  consumer side.

Consumers are also protected by semver independently of this: every site pins
a caret range on 0.x (`^0.9.0` = `<0.10.0`), so 0.10.0 arrives only by a
deliberate bump. 1.0 removes the old names and gives the new tokens literal
defaults; its changeset lists the one-line renames.

**Verified against Tailwind 4.3.3** (reviewer's compiled fixture, to be pinned
by Testing 1): Tailwind emits `--color-card: var(--color-surface)` and keeps
`--color-surface` with the consumer's value, including when the old name is
referenced only through an alias read by package CSS. No `@theme static` or
plain `:root` fallback is needed.

Aliases resolve where they are declared — at `:root` — and descendants inherit
the *result*. Overriding `--color-surface` on a section element does not
re-resolve the inherited `--color-card`. The same holds for every derived
default (`--carousel-dot`, `--field-accent`, `--color-accent`, …). D6 is
written around this.

### D3 — Contract for 0.10.0

| Token | Default | Replaces (alias kept) | Read by |
| --- | --- | --- | --- |
| `--color-primary` | unchanged | — | rich text links, active carousel dot, `--field-accent` |
| `--color-primary-foreground` | `var(--color-primary-contrast)` | `--color-primary-contrast` | consumers |
| `--color-card` | `var(--color-surface)` | `--color-surface` | field control background |
| `--color-card-foreground` | `var(--color-on-surface)` | `--color-on-surface` | consumers |
| `--color-muted-foreground` | `var(--color-muted)` | `--color-muted` | field description, `--carousel-dot` |
| `--color-border` | `var(--color-muted)` | — | rich text table, `hr`, blockquote |
| `--color-input` | `var(--color-border)` | — | field control border |
| `--color-ring` | `var(--color-focus)` | `--color-focus` | button and field focus outline |
| `--color-destructive` | `var(--color-error)` | `--color-error` | field error text |
| `--color-background` | `oklch(1 0 0)` | — | section theming (D6) |
| `--color-foreground` | `oklch(0.25 0.02 275)` | — | section theming (D6) |
| `--color-accent` | `var(--color-primary)` | — | section theming (D6) |
| `--color-accent-foreground` | `var(--color-primary-foreground)` | — | section theming (D6) |

Unchanged, no shadcn counterpart: `--radius-card`, `--shadow-raised`,
`--duration-expand`, `--color-backdrop`, `--field-accent`, `--richtext-*`,
`--heading-*`, `--carousel-dot`, `--carousel-dot-active`.

`--color-background`/`--color-foreground` share `--color-surface`/
`--color-on-surface`'s current literal defaults, so an unthemed page and an
unthemed card look as they do today.

### D4 — No shadcn `muted` background yet

In shadcn `muted` is a subtle background; here it is a text colour with live
`text-muted` usages. Reusing the name with the shadcn meaning would silently
repaint that text on bump. 0.10.0 ships `muted-foreground` only and deprecates
`muted`. A `muted` background can be added after 1.0 frees the name, and only
when a component needs one.

### D5 — What stays out of the package

Rule: **a token belongs in the package only if a package component reads it**,
the D6 pattern depends on it, or it is the replacement for a deprecated name
(`--color-primary-foreground`, `--color-card-foreground` — no component reads
them; they exist so the old names' utilities have a successor).

- **Fonts** (`--font-sans`, `--font-display`): no component reads them —
  `Heading` deliberately sets no family. They go in the consumer's theme.
- **A shared `--radius`:** shadcn derives its radius scale by redefining
  Tailwind's `--radius-sm…xl`. Doing that in the package's `@theme` would
  change every consumer's existing `rounded-lg` on bump. `--radius-card` stays.
- Spacing, shadows beyond `raised`, z-index, animation: per-site, unread.

### D6 — Section theming is a documented pattern (stretch)

Custom properties inherit, so a section re-themes the package components inside
it by re-declaring **every role those components read** on its root. Per D2,
declaring a few high-level roles is not enough: derived defaults were computed
at `:root` and do not follow. The README gains a "Themed sections" subsection
with the complete recipe:

```css
@utility band-accent {
  --color-background: var(--color-accent);
  --color-foreground: var(--color-accent-foreground);
  --color-primary: var(--color-accent-foreground);
  --color-border: color-mix(in oklch, var(--color-accent-foreground) 30%, transparent);
  --color-input: var(--color-border);
  --color-ring: var(--color-accent-foreground);
  --color-card: var(--color-accent);
  --color-card-foreground: var(--color-accent-foreground);
  --color-muted-foreground: color-mix(in oklch, var(--color-accent-foreground) 70%, transparent);
  --carousel-dot: var(--color-muted-foreground);
  --carousel-dot-active: var(--color-accent-foreground);
  --field-accent: var(--color-accent-foreground);
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

Declared on the same element, `var()` references between these lines resolve
against the band's own values, so the order-free block above is consistent.
Not re-themed on purpose: `--color-destructive` (an error stays red) and
`--color-backdrop` (a dialog's backdrop sits in the top layer, outside any
section).

Rejected: shipping `.sankara-theme-accent` / `.sankara-theme-inverse` classes.
Which roles an inverse band remaps differs between the only two sites with
bands; a package default would be a single-project decision. Revisit when a
third site needs it.

Considered for later: reading derived defaults at the use site
(`background: var(--carousel-dot, var(--color-muted-foreground))`) instead of
in `@theme`, so a band re-declares only the base roles. It changes the
"every token has an `@theme` default" invariant `tokens.test.ts` enforces;
not worth it for a stretch goal with one consumer.

## Consumer side (next-storyblok-template)

Same change window, separate PR in the template:

- Bump `@sankara-ui/core` to `^0.10.0`.
- `styles/globals.css` `@theme` becomes the **starter theme**, in two layers:
  a small raw palette with brand names (`--color-brand-*`), then every D3 role
  assigned from it, plus `--font-sans` and `--font-display`. Rebranding a new
  site = editing the palette and the two fonts.
- The template's own CSS reads roles, not raw values.
- One `band-accent` utility per D6 as the worked example.

## Declarations changed

CSS only, in `src/styles/tokens.css`; no component TSX reads these names.

- `.sankara-field-control`: `background` → `--color-card`, `border` →
  `--color-input`.
- `.sankara-field-description` → `--color-muted-foreground`.
- `.sankara-field-error` → `--color-destructive`.
- Button and field `:focus-visible` outline → `--color-ring`.
- Rich text `th, td`, `hr`, `blockquote` → `--color-border`.
- `--carousel-dot` default → `var(--color-muted-foreground)`.

Colour reads left unchanged: `--color-backdrop` (dialog backdrop),
`--color-primary` (rich text links, `--carousel-dot-active` and `--field-accent`
defaults). Together with the list above this is every `var(--color-*)` read in
`tokens.css`; D6's recipe covers all of them except the two exclusions it names.

## Testing

1. **Alias behaviour, in a compiled Tailwind fixture** (as `layer-order.test.ts`
   does), pinning what D2 records as verified:
   - every old → new alias, for both an old-only and a new-only consumer
     override;
   - an old name referenced only by package component CSS, with no utility
     candidate in the markup, is still emitted;
   - old utilities (`text-muted`, `text-primary-contrast`) still generate;
   - an old name overridden on an element does *not* change the inherited new
     role (documents the D2 limitation);
   - the full D6 recipe re-colours every package read it claims to.
2. `tokens.test.ts`: every `TOKENS` entry has a CSS default; every deprecated
   name is listed (new `DEPRECATED_TOKENS` map, old → new) and the new token's
   default is `var(<old>)`.
3. Update `field-css`, `richtext-css`, `button-css` and `carousel-css` tests to
   the new names.
4. README theming table: new names, a "Deprecated (removed in 1.0)" table, and
   the D6 subsection. CLAUDE.md's "three places in sync" gains the deprecated map.

## Release

Changeset: minor (0.9.0 → 0.10.0). Body: the rename table; "package component
defaults are visually unchanged, and overrides of deprecated names keep driving
their replacements"; the new-utility and name-collision caveats from D2 (naming
djalicunda's `--color-input`); "old names removed in 1.0".
