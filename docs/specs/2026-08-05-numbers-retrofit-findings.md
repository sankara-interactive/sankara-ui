# Consumer findings — numbers.ch retrofit (second consumer)

Date: 2026-08-05
Source: `numbers.ch` branch `feat/sankara-ui-heading-tokens` — Heading + token
adoption, then Expandable/FaqAccordion → `Disclosure` and CardSlider/Gallery →
`Carousel` (238 lines of hand-rolled UI deleted, three sections dropped their
client-island accordions entirely). Verified against a production build.
Carousel has no spec of its own (it predates the spec practice), so its
findings live here.

## Carousel — three gaps, each bridged consumer-side with recorded workarounds

1. **No responsive `perView`.** `perView={3}` stays literal at every viewport;
   at 500px that is 33%-wide slides, unusable. Both migrated call sites needed
   the consumer bridge numbers.ch already used for its hand-rolled sliders:

   ```css
   @media (max-width: 768px) {
     .numbers-carousel [aria-roledescription='slide'] { flex-basis: 78% !important; }
   }
   ```

   `!important` is required because the package sets `flex-basis` inline per
   slide. Two of two real consumers of a multi-slide carousel needed this on
   day one — responsive `perView` (or slide-width tokens) is the package's
   most-demanded missing feature.

2. **Dot colours are hardcoded utilities** (`bg-primary` active, `bg-muted`
   inactive). On a violet section — numbers.ch's QuickWins — `bg-primary` dots
   are invisible on the `--color-primary` background. No token, no prop, no
   variant reaches them; the consumer override needs `!important` to beat the
   utilities layer:

   ```css
   .numbers-carousel--onviolet button[aria-current='true'] { background: #fff !important; }
   ```

   Dot colours should read tokens (e.g. `--carousel-dot`,
   `--carousel-dot-active`) or at least be class-hookable.

3. **No namespaced class on the root** — the only component without one. The
   selectors above hang off consumer-supplied `className`; a
   `sankara-carousel` root class (matching every other component) would give
   consumers a stable hook and the stylesheet a place for future defaults.

Positives observed: the built-in keyboard support, aria roles/labels,
`aria-current` dots and reduced-motion handling are all strict upgrades over
both hand-rolled implementations they replaced; `label` from CMS headline
works well.

## Disclosure — fits, with two notes

- Native `<details name>` grouping cleanly replaced both accordion-with-state
  implementations, including "first row open" via `defaultOpen={i === 0}` and
  per-row background/shadow via `className`/`style` passthrough. Three
  sections became fully server-rendered.
- **Gap (minor): no "static row" affordance.** numbers.ch renders mixed lists
  where rows without body content are non-interactive pills. `Disclosure`
  always renders an interactive summary, so the consumer branches to a plain
  `<div>` per row. Fine, but worth a README pattern.
- The old implementations' `defaultOpen` was an *index* on the group; the
  package's per-item boolean plus `name` grouping expresses the same thing —
  no change needed, just a mapping note.

## Icon — the CMS free-text gap (migration deliberately deferred)

numbers.ch stores icon names as **free-text Storyblok fields** (17 fields,
descriptions telling editors "Font Awesome class, e.g. fa-bullseye") resolved
at runtime by the FontAwesome kit script. The package `Icon` takes an
`IconDefinition` object — a compile-time import. A `name → IconDefinition`
map can never be exhaustive against free text, so migrating silently breaks
any icon an editor types that the map missed — strictly worse than the kit's
"any valid name renders".

Options for the package (pick one, or explicitly declare CMS-driven icons out
of scope):

- Document the pattern: consumers with CMS-driven icons keep a runtime
  resolver (kit or their own registry) and use the package `Icon` only for
  code-authored icons.
- Ship an optional string-keyed lookup helper over the free-solid set with a
  documented fallback behaviour.

Until then, numbers.ch keeps its `Icon`/`IconBox`/`icon-data.ts`
(353 lines) — the one deletion target this retrofit could not take.
