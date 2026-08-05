# @sankara-ui/core

Shared UI components for sankara:interactive projects. Next 16 + Tailwind v4.

Every component, live: **[Storybook](https://sankara-interactive.github.io/sankara-ui/)**.

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

**Order matters.** Import the package stylesheet after `tailwindcss` and before
your own base styles. `RichText`'s defaults are plain element rules that tie
Tailwind's preflight and tie your own bare `h2`, and source order breaks both
ties — after preflight so the defaults apply at all, before your CSS so your
rules beat them. Import it last and your rich text typography stops matching
the rest of your site.

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
| `--color-focus` | Focus ring on `Button`, defaults to `--color-primary` |
| `--richtext-flow` | Vertical rhythm between rich text blocks |
| `--richtext-measure` | Line length when `RichText` applies the measure |
| `--richtext-h1` | `h1` size inside rich text, fluid |
| `--richtext-h2` | `h2` size inside rich text, fluid |
| `--richtext-h3` | `h3` size inside rich text, fluid |
| `--richtext-h4` | `h4` size inside rich text, fluid |
| `--heading-1` | `Heading` `.h1` size, fluid — page headings, not rich text |
| `--heading-2` | `Heading` `.h2` size, fluid |
| `--heading-3` | `Heading` `.h3` size, fluid |
| `--heading-4` | `Heading` `.h4` size, fluid |

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

## Button

Correctness, not appearance. `Button` gives you `type="button"` by default, one
prop to render as a link, native `disabled`, and a focus ring — and no colours,
padding or radius, because every project's differ. Bring your own classes.

```tsx
import { Button } from '@sankara-ui/core'

<Button className="btn btn-primary">Termin vereinbaren</Button>
<Button className="btn btn-primary" type="submit">Absenden</Button>
```

`type="button"` is the default deliberately: an untyped `<button>` inside a
`<form>` submits it, which is the single most common accidental-submit bug.
Opt into `type="submit"` when you mean it.

### Rendering as a link

`render` takes an element and the component becomes it, keeping your props:

```tsx
import Link from 'next/link'

<Button className="btn btn-primary" render={<Link href="/kontakt" />}>
  Kontakt
</Button>

<Button className="btn btn-primary" render={<SbLink link={blok.link} />}>
  {blok.label}
</Button>
```

The package imports neither `next/link` nor anything Storyblok — you pass the
element, so your own CMS link helper works unchanged.

Element-specific props (`href`, `target`, `ref`, …) go on the element you pass,
not on `Button`. `className` and `style` merge rather than replace, and on a
colliding key the render element's own value wins; both `onClick` handlers run
with `Button`'s first; `Button`'s `children` replace the render element's; and
everything else is the render element's own. `disabled` is the one exception —
`Button`'s value wins when you set it, and the element's own applies when you
do not. A fragment or a list throws. A
custom component has to forward unknown props to a real element — one that
swallows them renders unstyled, and nothing can detect that before it renders.

`type` and `disabled` only ever apply to a literal `<button>` element or to the
default branch (no `render` at all). A custom component that renders a
`<button>` internally still gets neither — `Button` cannot see through
`render` to what the component ultimately renders, so it is treated as a link:
no `type="button"`, and it can submit an enclosing form by accident. Nothing
can detect this at runtime, so avoid wrapping a `<button>` in a component you
hand to `render` when either matters.

Keep interactive elements out of `children`. A link inside a button, or a button
inside a rendered link, is invalid HTML and breaks keyboard and screen-reader
behaviour. The component renders what you give it and cannot check this.

### Disabled

`disabled` works on a real `<button>` and nowhere else, where the platform
removes it from the tab order and blocks activation with no JavaScript. Passing
it alongside a link `render` logs an error in development and does nothing: a
disabled `<a>` does not exist in HTML, and `aria-disabled` on a still-operable
link tells assistive technology something untrue. Don't render the link instead.

### Focus and styling

The focus ring is `outline: 2px solid var(--color-focus)`, offset from the
control, and appears for keyboard users only. Override `--color-focus` in your
own `@theme`; it defaults to `--color-primary`.

The component's own rules live in `@layer components`, so any Tailwind utility
you put on it wins — assuming your stylesheet keeps Tailwind's standard layer
order, which `@import "tailwindcss"` sets up.

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
both `position-area`, which Firefox ships in 147, and `position-anchor`, whose
Firefox support is partial before 151. Without them the panel is a full-bleed
sheet at the bottom of the viewport instead of an anchored dropdown —
deliberately a different layout, never a misplaced one.

## RichText

Tailwind's preflight strips margins, list markers, heading sizes and link
underlines from every element. That is fine for markup you author and wrong for
CMS output, which nobody does. `RichText` puts the semantics back.

```tsx
import { RichText } from '@sankara-ui/core'

<RichText>
  <RichTextRenderer text={blok.text} />
</RichText>
```

The class does the work, so if you already have a wrapper you can skip the
component entirely:

```tsx
<article className="sankara-richtext sankara-richtext-measure">…</article>
```

Use the class rather than the component if your renderer hands you an HTML
*string* instead of nodes — `children` is required and takes React nodes:

```tsx
<div className="sankara-richtext sankara-richtext-measure"
     dangerouslySetInnerHTML={{ __html: html }} />
```

Covered: block rhythm, `h1`–`h4` (fluid sizes), `h5`/`h6` (weight only), lists
including nesting, links, tables, `hr`, an image inside a paragraph or a list
item or a cell (preflight makes those block-level, which breaks the line in
two), and a minimal `blockquote` fallback. Not covered, and rendering as plain
body text if they appear: `code`/`pre`, `figure`/`figcaption`, and anything
Storyblok adds later. Embedded bloks pass through untouched but do receive
block rhythm as siblings.

**The content must be direct children of the container.** Block rhythm and the
measure both target direct children, so one wrapping element between the
container and the content silently removes all spacing and moves the measure
onto the wrapper. If your `RichTextRenderer` returns a root element rather than
a fragment, put the class on that element instead of nesting it.

### Overriding it

Everything ships in `@layer base`, with `:where()` on the container class only:
`:where(.sankara-richtext) h2`. The class contributes no specificity, so each
rule lands at the specificity of a bare `h2` — tied with Tailwind's preflight
and tied with your own bare element rules. Three things beat it:

- a class-scoped rule of yours, e.g. `.richtext h2 { … }`
- any Tailwind utility
- a bare element rule of yours, e.g. `@layer base { h2 { … } }` — but *only*
  because your CSS loads after ours. That tie is broken by source order alone,
  so it depends on the install order above.

Tune the rest with the `--richtext-*` tokens in your own `@theme`.

**If your headings look wrong inside rich text**, check that import order first.
Half-overridden typography is the usual symptom: scope some of your heading
declarations to a class (`.richtext h2 { font-size: 4rem }`) and leave the rest
bare, and the scoped ones win while the bare ones lose to ours — your size with
our weight.

### Measure

`measure` constrains text to `--richtext-measure` (`68ch`) and is on by default.
It applies to the text children, not the container, so tables, figures, images,
video, iframes and anything marked `data-wide` still use the full width. Pass
`measure={false}` to drop it. It sets width only — centre the column yourself
if you want that.

`ch` is the width of a "0" in your typeface, so `68ch` is a different line length
in every brand. Lower the token if your face is wide. It is resolved once, on the
root element, and inherited as a fixed length — so every child gets the same
measure regardless of its own font, and a webfont swapping in reflows the whole
column at once rather than each element separately. That reflow is real: the same
`68ch` measured 532px in monospace, 583px in Impact and 668px in Georgia, so
`font-display: swap` moves your line length by more than 100px when the face
lands.

### Hyphenation needs `lang`

`h1`–`h4` hyphenate, which German compounds need — "Unter­nehmens­nachfolge"
otherwise overflows a narrow column. This does nothing without a `lang` attribute,
and the nearest one must describe the *content*: a German page with a French rich
text field needs `<RichText lang="fr">`, not the page's `lang`. `lang` passes
through like any other prop.

`hyphenate-limit-chars`, which keeps short words whole, is not supported
everywhere — where it is missing, short words break too.

### Wide tables

A table with more columns than fit still overflows. Wrapping it in a scroll
container changes the accessibility tree and needs a label, so your renderer owns
that decision.

## Heading

A heading's level in the document outline and its size on screen are two
different decisions. A card title is an `h3` for screen readers and looks like
an `h4`. `Heading` makes that two props instead of a tag and a hand-written
class.

```tsx
import { Heading } from '@sankara-ui/core'

<Heading level={3} visual={4}>{blok.headline}</Heading>
// → <h3 class="h4">…</h3>
```

`level` is required — the outline decision is never implicit. `visual` defaults
to `level`, and the class is emitted either way, so `<Heading level={2}>`
renders `<h2 class="h2">`.

### What it styles

`.h1`–`.h4` get a `font-size` from `--heading-1`–`--heading-4` and a
`line-height`. Nothing else — no weight, family, colour or margin. Those differ
in every project, and a package default in those columns is something you fight
rather than build on.

Two consequences worth knowing before you file a bug:

- **Headings render at body weight** until you set one. Tailwind's preflight
  sets `font-weight: inherit` on `h1`–`h6`. Add `.h1, .h2, .h3, .h4 { font-weight: 700 }`
  — or whatever your brand uses — to your own base styles.
- **`.h5` and `.h6` carry no rule at all.** They are emitted as hooks for your
  own CSS.

### Overriding it

The rules ship in `@layer base` on the class alone — `.h1`, never `h1, .h1` —
so installing this package changes nothing about headings you wrote yourself.
Only what `Heading` emits is styled.

To override, define the class in your own stylesheet:

```css
@layer base {
  h1, .h1 { @apply font-display text-5xl font-extrabold md:text-7xl; }
}
```

That ties the package's rule and wins on source order, which is why the install
order above matters. A rule of yours that is unlayered, or in `@layer components`
or `@layer utilities`, wins outright regardless of order.

**One sharp edge.** If you style the bare tag *only* — `h1 { … }` with no `.h1`
— the package's `.h1` wins, because a class beats a type selector. Add the
class to your existing selector and you are back in control. Every project this
package was derived from already writes the pair.

### Levels from a CMS

A Storyblok level field is usually a string option list (`"h2" | "h3" | …`),
while `level` is a number. Map it at the call site:

```tsx
<Heading level={Number(blok.level?.slice(1) ?? 2) as 1 | 2 | 3 | 4 | 5 | 6}>
  {blok.headline}
</Heading>
```

The component does not validate at runtime: a TypeScript caller gets a compile
error, and `level={7}` from untyped JavaScript renders an invalid `<h7>` rather
than throwing.

### Don't pass a second heading class

`<Heading level={2} visual={4} className="h1">` emits `class="h4 h1"`, and class
order in the attribute decides nothing — whichever rule sits later in the
stylesheet wins. `visual` is authoritative only when it is the only heading
class on the element.

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
