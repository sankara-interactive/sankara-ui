---
'@sankara-ui/core': minor
---

Carousel: namespaced classes, token-driven dots, responsive slide widths.

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
