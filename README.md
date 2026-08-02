# @sankara-ui/core

Shared UI components for sankara:interactive projects. Next 16 + Tailwind v4.

## Install

```sh
yarn add @sankara-ui/core
yarn add @fortawesome/fontawesome-svg-core @fortawesome/react-fontawesome
```

`react`, `react-dom` and `tailwindcss` are expected peers — every target
project already has them.

Then in your global stylesheet — **both lines are required**:

```css
@import "tailwindcss";
@import "@sankara-ui/core/styles.css";
@source "../node_modules/@sankara-ui/core";
```

Tailwind v4 does not scan `node_modules` by default. Without the `@source`
line the components render completely unstyled, with no error.

## Theming

`@sankara-ui/core/styles.css` ships neutral defaults for every token. Override any
of them in your own `@theme` block, after the import:

| Token | Purpose |
| --- | --- |
| `--color-primary` | Accent — active carousel dot, emphasis |
| `--color-primary-contrast` | Foreground on `--color-primary` |
| `--color-surface` | Card and panel background |
| `--color-on-surface` | Body text on `--color-surface` |
| `--color-muted` | Secondary text, inactive controls |
| `--radius-card` | Corner radius for cards and panels |
| `--shadow-raised` | Elevation for raised surfaces |
| `--duration-expand` | Open/close duration for `Disclosure` and `Dialog` |
| `--color-backdrop` | `::backdrop` behind an open `Dialog` |

## Icons

`Icon` takes a FontAwesome `IconDefinition`. The package deliberately ships no
icon set, so it works with the free packages, Pro, or a Kit — install
whichever one you use (the example below sources its icon from
`@fortawesome/free-solid-svg-icons`):

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Icon } from '@sankara-ui/core'

<Icon icon={faChevronDown} size={22} label="Mehr anzeigen" />
```

Omit `label` for decorative icons; they are then hidden from assistive tech.
`label` becomes `aria-label` plus `role="img"` — FontAwesome 7 deprecated its own
`title` prop in favour of exactly this.

## Carousel

```tsx
import { Carousel } from '@sankara-ui/core'

<Carousel label="Referenzen" perView={2.2}>
  {items.map(item => <Card key={item.id} {...item} />)}
</Carousel>
```

Static scroll-snap only. Autoplay, looping and synced carousels are not
included yet.

## Disclosure

Native `<details>`/`<summary>` — a server component that ships no JavaScript.

```tsx
import { Disclosure } from '@sankara-ui/core'

<Disclosure summary={<h3>Wie lange dauert ein Projekt?</h3>} className="border-t py-5">
  <p className="pt-4">Zwischen vier und zwölf Wochen.</p>
</Disclosure>
```

Give several items the same `name` to make them an exclusive accordion —
opening one closes the others, natively:

```tsx
{questions.map(q => (
  <Disclosure key={q.id} name={`faq-${section.id}`} summary={<h3>{q.question}</h3>}>
    {q.answer}
  </Disclosure>
))}
```

`name` groups `<details>` across the **whole document**, not just the elements
you rendered together, so derive it from a stable content id. HTML allows only
one initially-open member per group; `defaultOpen` on two items sharing a name
is invalid markup.

Children render directly, with no wrapper element, so the elements you pass
carry your own attributes — which is how schema.org FAQ microdata works:

```tsx
<Disclosure itemScope itemType="https://schema.org/Question" summary={<h3 itemProp="name">…</h3>}>
  <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">…</div>
</Disclosure>
```

Two caveats worth knowing. A heading inside `<summary>` may lose its heading
role in some browser/screen-reader pairs — put the heading outside the
`<details>` where heading navigation matters. And interactive controls inside
`summary` are not supported; native activation does not survive them.

The open/close transition uses `::details-content` and `interpolate-size`.
Browsers without them snap open instead of animating — the content stays
present and reachable either way. `prefers-reduced-motion` disables it.

`indicator` replaces the default chevron. The root carries `group`, so your own
indicator can express the open state (`group-open:rotate-180`, or a `+`/`−`
swap with `group-open:hidden`).

## Dialog

Native `<dialog>` opened with `showModal()`, so the focus trap, Escape, the top
layer, `::backdrop` and background inertness come from the browser. The open
state is controlled — there is no built-in trigger.

```tsx
'use client'
import { Dialog } from '@sankara-ui/core'

const [open, setOpen] = useState(false)

<button type="button" onClick={() => setOpen(true)}>Termin vereinbaren</button>

<Dialog open={open} onRequestClose={() => setOpen(false)} aria-labelledby="titel">
  <h2 id="titel">Standort wählen</h2>
  <button type="button" autoFocus onClick={() => setOpen(false)}>Abbrechen</button>
</Dialog>
```

`onRequestClose` is a **request**, not a notification: it fires for Escape, an
outside click and `<form method="dialog">`, and you decide whether to honour it.
Closing by setting `open` to `false` does not call it back.

`placement="end"` gives an off-canvas side sheet on the logical inline edge (it
flips under RTL); `size` is a max-width when centered and a width when it is a
sheet. `closeOnOutsideClick={false}` governs outside clicks only — Escape always
closes, deliberately.

Name the dialog yourself with `aria-labelledby` pointing at a heading in the
content, or `aria-label`. The component adds neither, and a heading without an
`id` that something references names nothing. Give the least-destructive control
`autoFocus`, and always include a visible close or cancel button — Escape and
backdrop clicks are neither discoverable nor available to every input method.

Two known limits. Scrolling behind the dialog is locked with `overflow: hidden`
on `<html>`, ref-counted across dialogs, which **iOS Safari ignores** — if that
matters for your site, handle it at the app level. And the open/close transition
uses `@starting-style` with discrete `display`/`overlay` transitions; browsers
without them show the dialog instantly rather than animating it.
