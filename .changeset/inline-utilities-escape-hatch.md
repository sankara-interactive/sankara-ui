---
'@sankara-ui/core': minor
---

Make the `className` escape hatch reliable on `Carousel`, `Disclosure`, `FaIcon`
and `Dialog` (the form spec's D9 follow-up).

All four spelled their defaults as Tailwind utilities in JSX, which compile
into `@layer utilities` — the consumer's own layer. `cn` is a plain join, so
both classes reached the class attribute and Tailwind's canonical sort decided
the winner. Measured against a 4.3.3 build: the package's `gap-6` beat a
consumer's `gap-2` but lost to `gap-8`, and `inline-flex`/`shrink-0` beat `flex`
and `shrink`. Roughly half of all overrides failed silently.

Those defaults now live in `styles.css` under `@layer components`, which sits
before `utilities` in Tailwind's layer order, so any consumer utility wins by
layer alone — the same guarantee `Button`, `Popover` and the form controls
already had. New classes: `.sankara-carousel-dots`, `.sankara-disclosure-summary`,
`.sankara-disclosure-indicator`, `.sankara-fa-icon`. The active carousel dot is
now sized from `[aria-current='true']` rather than a JSX ternary.

Consequence worth checking on upgrade: all four now get their layout from the
stylesheet, so `@import "@sankara-ui/core/styles.css"` is no longer optional for
them. It was already required by the install instructions and by `Dialog`,
`Disclosure` and `Popover`.

`Dialog` is included, with a smaller change than it looks: its `max-w-*` size map
already survived the sort, but `m-auto`, `ms-auto`, `h-dvh`, `max-h-dvh`,
`overflow-y-auto` and the `w-[min(…)]` drawer widths did not. Sizes are now
`.sankara-dialog-sm` / `-md` / `-lg`, meaning a max-inline-size when centred and
an inline-size when docked to the edge. A consumer who was overriding the drawer
with `w-*`, `h-*`, `max-h-*`, `overflow-*` or `m-*` gets a different result than
before — the one they asked for.

`Icon` keeps its two utilities deliberately, since it ships from the `./icon`
subpath where the stylesheet may never be imported.
