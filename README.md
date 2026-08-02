# @sankara-ui/core

Shared UI components for sankara:interactive projects. Next 16 + Tailwind v4.

## Install

```sh
yarn add @sankara-ui/core
```

`react`, `react-dom` and `tailwindcss` are expected peers — every target
project already has them. The two FontAwesome peers are optional and only
needed for [`Icon`](#icons):

```sh
yarn add @fortawesome/fontawesome-svg-core @fortawesome/react-fontawesome
```

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

`Icon` is the one component that needs FontAwesome, so it sits behind its own
entry point — the main entry never loads it, and projects that don't use icons
don't need the peers installed at all.

It takes a FontAwesome `IconDefinition`. The package deliberately ships no
icon set, so it works with the free packages, Pro, or a Kit — install
whichever one you use (the example below sources its icon from
`@fortawesome/free-solid-svg-icons`):

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Icon } from '@sankara-ui/core/icon'

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

## Popover

Native `popover="auto"` with the declarative invoker, so light dismiss, `Escape`,
the top layer and one-open-at-a-time across a nav bar come from the browser.

```tsx
import { Popover } from '@sankara-ui/core'

<li>
  <Popover
    id={`nav-${item.id}`}
    className="w-72 rounded-card bg-surface p-2 text-on-surface shadow-raised"
    trigger={
      <button type="button" className="flex items-center gap-2">
        Leistungen
        <Chevron className="popover-open:rotate-180 transition-transform" />
      </button>
    }
  >
    <ul>{links}</ul>
  </Popover>
</li>
```

The component renders the trigger and the panel as siblings and adds no wrapper,
so the `<li>`, `<nav>` or CMS-editable element around them stays yours. It also
adds no `role` — a dropdown of links is a list of links, not a command menu,
and ARIA defines `role="menu"` as replacing `Tab` navigation with arrow keys
and typeahead, the wrong contract here.

`id` is optional and defaults to a generated one. Supply it when you need stable
markup; it must then be document-unique **and** a valid CSS identifier, because
it becomes the anchor name.

`placement` takes `bottom-start` (default), `bottom`, `bottom-end`, `top-start`,
`top` and `top-end`. They are logical, so they flip under RTL.

`popover-open:` is a variant this package ships, tested against Tailwind 4.3.3.
It works on the trigger itself or on any descendant of it — a chevron, a label —
so you can express the open state without JavaScript.

The trigger must be a `<button type="button">` (or a button-like `<input>`):
`popovertarget` does nothing on an `<a>`, and an untyped `<button>` inside a
`<form>` submits it. A custom component as trigger has to forward unknown props
to a real button — and that forwarded button must be the component's outermost
element. Wrapping it (`<span><button {...props} /></span>`) still opens the
popover, but the button is no longer the panel's previous sibling, so
`:has(+ [popover]:popover-open)` never matches and `popover-open:` silently
stops working on it.

An unmodified primary click on an `<a href>` inside the panel closes it;
modified clicks, links whose `target` is anything other than `_self`
(including but not limited to `target="_blank"`), `download` links and
anything that calls `preventDefault()` leave it open. The reasoning: a
popover's open state is DOM state, which a client-side navigation would not
reset on its own.

Two limits worth knowing. The panel is in the top layer, so it always paints
above ordinary page content whatever your header's `z-index` — and no `z-index`
can raise it above a `<dialog>` or a popover opened after it. And CSS anchor
positioning needs Chrome 129+, Firefox 151+ or Safari 26+ — the gate requires
both `position-anchor` and `position-area`, and Firefox ships them in 147 and
151 respectively, so the later version is what governs; without it the panel
is a full-bleed sheet at the bottom of the viewport instead of an anchored
dropdown — deliberately a different layout, never a misplaced one.

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
