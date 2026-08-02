# `Popover` — Design

Date: 2026-08-02
Status: draft, pending implementation
Scope: Tier 2 of `next-storyblok-template/docs/enhancement-roadmap.md`, third
component after `Disclosure` and `Dialog`

## Problem

The survey counted `Popover` 25 and `Menu` 11 — the two highest-frequency
headless primitives after `Dialog`. Reading the actual call sites shows those
two numbers describe **one** pattern: a trigger and an anchored panel that
dismisses on outside click and `Escape`. Four projects build it three different
ways, and the fifth hand-rolls a full-screen overlay instead.

## Evidence base

| Project | Component | What it is | Built with | Boundary |
| --- | --- | --- | --- | --- |
| brillen-werk.ch | `NavDropdown` | nav dropdown | native `popover="auto"` + `anchor-name`/`position-anchor`/`position-area` | client |
| fgpfister.ch | `NavDropdown` | nav dropdown | Radix `NavigationMenu` | server |
| nuwa.swiss | `nav_link` | nav dropdown | Headless UI `Popover` + `PopoverPanel anchor="bottom"` | client |
| fairmed.ch-sb | `FilterSelect` | filter panel | Headless UI `Popover` | client |
| numbers.ch | `HeaderClient` | full-screen mobile overlay | `useState` + manual scroll lock and `Escape` handler | client |

Four findings, two of which change the plan:

1. **There is no `Menu` in the estate.** Nothing uses `role="menu"`,
   `menuitem`, roving focus or typeahead. The survey's "Menu 11" is import names
   and components called `MainMenu`. Four of the five usages are lists of links,
   where an ARIA menu is the *wrong* role: it makes screen readers announce
   "menu, 5 items" and switch to menu navigation, replacing `Tab` with arrow
   keys, for what is a list of page links.
2. **The newest project already ships the native Popover API in production.**
   brillen-werk.ch uses `popover="auto"` with CSS anchor positioning, no
   library. This is the same shape of evidence that decided `Disclosure`.
3. **Two of the four usages are one component away from each other.** A nav
   dropdown and fairmed's filter panel differ only in what the caller puts
   inside the panel. Neither needs roles or markup contributed by the component.
4. **numbers.ch's overlay is not a popover.** It is a full-screen mobile menu
   with a scroll lock — a `Dialog` concern, already shipped. Out of this spec.

## Decisions

### D1 — One `Popover`; no `Menu` in this tier

`Menu` is deferred until a project has an actual command menu — a "…" actions
menu or an account menu — which is application UI, not the marketing sites this
package serves. Adding it later is a new export and a minor bump; shipping it
now means publishing a public API that no usage has exercised.

The extension path is preserved by D5: because `Popover` contributes no roles
and no markup to the panel, a future `Menu` is this component plus a roving
focus and roles layer, not a rewrite. The trap to avoid is baking nav-list
semantics into the panel.

This is the third component in a row to land on a native element, after
`Disclosure` (`<details>`) and `Dialog` (`<dialog>`). The original design spec's
D3 — Base UI as the headless foundation — now has no consumer in any shipped
component and should be reopened rather than left standing.

### D2 — Native `popover="auto"` with the declarative invoker

`popover="auto"` supplies light dismiss, `Escape`, top-layer stacking, and
one-open-at-a-time across a nav bar — the last of these being what fgpfister
uses Radix `NavigationMenu` for, and the direct parallel to `<details name>` in
`Disclosure`.

Precisely: opening an auto popover closes other *unrelated* auto popovers.
Nested ones stack, so a popover inside a panel keeps its ancestor open. No
usage needs that today; it is a tested behaviour, not a supported feature.

Top-layer stacking is absolute in one direction and unavailable in the other:
the panel always paints above ordinary page content whatever the header's
`z-index`, and no `z-index` on the panel can raise it above a `<dialog>` or a
popover opened after it. Panel classes control stacking only within the panel.

The trigger must be a `<button type="button">`, or an `<input>` of type
`button`, `reset` or `submit`. `popovertarget` has no effect on an `<a>`, and an
untyped `<button>` inside a `<form>` submits it.

The invoker must be the declarative `popovertarget` attribute, never
`showPopover()` from JavaScript. Per MDN, the declarative form sets up an
implicit `aria-expanded` and `aria-details` relationship between invoker and
popover; the imperative form with a `source` option changes focus navigation
only, without the ARIA mapping. brillen-werk's hand-written
`aria-haspopup="menu"` is therefore both redundant and the wrong role for a
list of links.

### D3 — Optional `id`, defaulting to a sanitised `useId`

The `id` is the `popovertarget`, the panel's `id`, and both halves of the anchor
pair (`anchor-name: --{id}` / `position-anchor: --{id}`). Four things that must
agree, which is the wiring worth owning.

The explicit anchor pair is required, not decorative. MDN documents an
*implicit* anchor reference between a popover and its `popovertarget` invoker,
which would make `anchor-name`/`position-anchor` unnecessary — but nothing
tethers to it unless `position-anchor` resolves to that implicit anchor, and its
initial value differs per engine (Chrome `none`, Safari 26 `auto`, Firefox 151
`normal`). Measured in Chrome 150 on a page with two identical popovers:

| | trigger | panel |
| --- | --- | --- |
| implicit anchor only | top 400, left 300 | **top 0, left 0 — unanchored** |
| explicit `anchor-name` + `position-anchor` | top 600, left 300 | top 621, left 300 |

So the pair stays until `position-anchor: normal` is interoperable. Revisit then;
it deletes this decision's complexity entirely.

Because D6 already makes this a client component, `useId` is available. `id` is
therefore optional, defaulting to `useId()` with characters invalid in a CSS
identifier stripped — React's generated ids contain `«»` or `:` depending on
version, and `--«r1»` is not a usable `anchor-name`. An explicit `id` stays
supported for deterministic markup and tests, and must then be document-unique
and a valid CSS identifier.

brillen-werk builds its anchor name from a raw `useId()`, so its dropdown is
likely unanchored and merely *looking* right near the top of the viewport. Not
verified in their app, and nothing here depends on it.

### D4 — Anchor positioning in CSS, degrading to a full-bleed sheet

A `popover` element is in the top layer whenever it is open, so its containing
block is the viewport. `position: absolute; top: 100%` means nothing there.
Where anchor positioning is missing, a panel does not merely lose an animation
the way `Disclosure` does — it lands somewhere visibly wrong.

Support, from MDN browser-compat data rather than secondary sources:

| Property | Chrome | Firefox | Safari |
| --- | --- | --- | --- |
| `position-area` | 129 | 147 | 26 |
| `position-anchor` | 144 (partial) | 151 | 26 |

So the feature is interoperable across current engines, and absent from real
Safari 18.x — the same engine gap the `Disclosure` matrix left open.

The gate must name both halves, because the two properties ship in different
versions and `@supports` only proves that what it asks about parses:

```css
@supports (position-anchor: --a) and (position-area: block-end) { … }
```

`position-try-fallbacks: flip-block, flip-inline` goes inside that block but is
not part of the condition — where it is unsupported the panel simply does not
flip near a viewport edge, which is a lesser degradation than losing the anchor.
So the flip is a progressive enhancement, not something the gate promises.

The base rules — outside the `@supports` block, and overridden by it — are the
fallback, and they have to defeat the UA stylesheet, which gives `[popover]`
`position: fixed; inset: 0; margin: auto`, i.e. viewport-centred. The fallback
must therefore set, explicitly: `inset: auto 0 0 0`, `margin: 0`, `width: auto`,
`max-block-size` capped in `svh` with `overflow: auto`, and bottom padding from
`env(safe-area-inset-bottom)`. Anything less leaves a centred or over-constrained
box rather than a sheet.

The result is a deliberate layout, not an approximation of an anchored one — the
panel is never mispositioned, only presented differently, and a bottom sheet is
the familiar pattern on the phones where Safari 18 predominantly lives.
Verification must include 320px, long content, zoom, RTL and safe-area cases.

Rejected: measuring the trigger with `getBoundingClientRect()` and re-measuring
on scroll and resize. That is 15–25 lines reimplementing the platform feature,
and its failure mode — position drifting out of sync with a top-layer element —
is worse than a different-but-coherent layout.

### D5 — No wrapper, no roles, no markup in the panel

The component emits exactly two elements, as siblings:

```html
<button popovertarget="nav-x" style="anchor-name:--nav-x">…</button>
<div id="nav-x" popover="auto" style="position-anchor:--nav-x">…</div>
```

The caller's `<li>`, `<nav>` or `storyblokEditable` wrapper stays theirs, as in
`Disclosure`'s D6. The panel gets no `role`, no list markup, no item components
— a filter panel and a nav dropdown are the same component with different
children.

Sibling order is load-bearing: the trigger's open-state hook in D7 depends on
the panel being the trigger's next sibling.

Consequences to document, because returning a fragment is not free:

- Where the parent's content model demands specific children, the caller
  supplies the wrapper. In a nav bar that means `<li><Popover …/></li>`, as
  fgpfister and brillen-werk already write.
- There is no root element, so no root `ref` and no root class. `className`
  always means the panel.

### D6 — `'use client'` for one delegated click handler

Four of five usages are lists of links. `popover="auto"` light-dismisses on
clicks *outside* the panel; a click on a link *inside* it navigates, and with
App Router the header layout persists, so the panel stays open over the newly
rendered page. It resolves only on a full page load.

**Unverified in a running App Router app** — reasoned from persistent DOM state
across client-side navigation, and the first thing implementation should check.

The component therefore ships one delegated `click` handler on the panel: if the
click originated from an `<a href>` inside it, call `hidePopover()`. That is the
sole reason for the client boundary, and it is the same trade `Dialog` already
made. The alternative — a documented one-liner on every consumer's nav item —
pushes the majority case onto every consumer and is exactly the line that gets
forgotten.

This is public behaviour, not an implementation detail, and the conditions are
part of the contract. The panel closes only when **all** hold: the click
resolves to an `<a href>` via `closest()`, it is an unmodified primary click (no
`ctrl`/`meta`/`shift`/`alt`, `button === 0`), the link has no `download` and no
`target` other than `_self`, and nothing called `preventDefault()`. A caller's
own `onClick` on the panel runs first and can cancel the close by preventing
default — the same gesture that cancels the navigation.

Rejected: a `closeOnLinkActivation` prop. Reading a prop to decide whether to
attach the handler still requires a client component, so the prop buys nothing
structural, and every nav consumer would set it. A filter panel containing a
help link closes when that link is followed, which is correct behaviour for a
link that navigates away.

### D7 — Trigger open-state exposed as a Tailwind variant

The platform gives the invoker no open-state hook for CSS, and all three nav
dropdowns in the estate rotate a chevron on the trigger. Because the panel is
the trigger's next sibling, `:has(+ [popover]:popover-open)` reaches the trigger.

It must also reach *inside* the trigger. The chevron is a child of the button,
and a child's next sibling is not the panel — a variant written as
`&:has(+ [popover]:popover-open)` silently never matches on the element people
will actually put the class on. The variant therefore matches the trigger or any
descendant of it:

```css
@custom-variant popover-open (&:is(
  [popovertarget]:has(+ [popover]:popover-open),
  [popovertarget]:has(+ [popover]:popover-open) *
));
```

so `popover-open:rotate-180` works on the chevron and on the button alike.

**Spiked, confirmed.** Tested against Tailwind CSS 4.3.3 (`@tailwindcss/cli`):
a minimal npm project imported a copy of `tokens.css` (with the `@custom-variant
popover-open` block appended) via `@import "./pkg/tokens.css";` after
`@import "tailwindcss";`, then used `popover-open:rotate-180` on a `<span>`
nested inside a `.sankara-popover-trigger` button and `popover-open:opacity-100`
on the sibling `[popover]` panel. The compiled output contained:

```css
.popover-open\:rotate-180:is(.sankara-popover-trigger:has( + [popover]:popover-open), .sankara-popover-trigger:has( + [popover]:popover-open) * ) {
  rotate: 180deg;
}
```

This confirms both open questions: a `@custom-variant` declared in an
*imported package* stylesheet does reach the consumer's Tailwind v4 build, and
the compiled selector's `* ` branch matches the nested chevron, not only the
trigger itself. D7 ships the variant as designed; no fallback needed.

### D8 — Animation mirrors `Dialog`

"Mirrors `Dialog`" is not enough to implement from, because entry is easy and
exit is where discrete transitions go wrong. The state model, explicitly:

- The closed state lives on the panel's base rules (`opacity: 0`, a small
  `translate`), the open state on `:popover-open`, and the pre-open state in
  `@starting-style` attached to `:popover-open`.
- `transition` is declared on the panel base — not only on `:popover-open` —
  otherwise the exit never animates because the rule stops applying the moment
  the popover closes.
- `display` and `overlay` are both in the transition list with
  `transition-behavior: allow-discrete`. Omitting `overlay` drops the panel out
  of the top layer at once and the exit animation plays in the wrong stacking
  context.
- Duration is `--duration-expand`; `prefers-reduced-motion: reduce` sets it to
  `0s` rather than removing the declarations.

Engines without `@starting-style` show the panel instantly, the same degradation
`Dialog` documents. Verify entry, `Escape` exit, light-dismiss exit, link-click
exit, reduced motion, and reopening mid-exit.

## API

```ts
type PopoverProps = {
  /** Defaults to a sanitised useId(). If given: document-unique and a valid
      CSS identifier. Drives popovertarget, the panel id, and the anchor pair. */
  id?: string
  /** A <button type="button"> or button-like <input>. Cloned to add
      popovertarget and the anchor-name style. */
  trigger: ReactElement<ComponentPropsWithoutRef<'button'>>
  /** Default 'bottom-start'. Mapped to position-area per the table below. */
  placement?:
    | 'bottom-start' | 'bottom' | 'bottom-end'
    | 'top-start' | 'top' | 'top-end'
  /** Panel classes. */
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'id' | 'className' | 'children' | 'popover'>
```

Remaining props land on the panel; `popover` and `id` are not overridable
because the component's behaviour is defined in terms of them. A caller `style`
is merged, with the component's positioning properties applied last — they win.
A caller `onClick` composes as described in D6.

`placement` values are API tokens, **not** `position-area` syntax, which takes
one or two grid keywords. The mapping is logical, so all six flip under RTL:

| `placement` | `position-area` | extra |
| --- | --- | --- |
| `bottom-start` (default) | `block-end span-inline-end` | — |
| `bottom` | `block-end span-all` | `justify-self: anchor-center` |
| `bottom-end` | `block-end span-inline-start` | — |
| `top-start` | `block-start span-inline-end` | — |
| `top` | `block-start span-all` | `justify-self: anchor-center` |
| `top-end` | `block-start span-inline-start` | — |

The centred rows need `anchor-center` because `block-end center` would constrain
the panel to the trigger's own width — which is also the documented workaround
for the `position-area` overflow bugs in Chrome 129–143 and Firefox 147–148.

The trigger is cloned, so: fragments and components that render multiple nodes
are rejected at runtime with a clear error; a custom component as trigger must
forward unknown props to a real `<button>`, which the component cannot enforce;
and a caller-supplied `popovertarget` is overwritten, since it would break the
pairing.

Panel width is the caller's (`w-72` in fgpfister, `md:w-96` in fairmed,
`xl:w-[800px]` in nuwa) — no `size` prop.

## Accessibility

- The declarative invoker relationship (D2) establishes an implicit
  `aria-expanded` and `aria-details` **accessibility mapping** — a state in the
  accessibility tree, not attributes in the DOM. The component adds neither, and
  must not; tests assert against the accessibility tree, never `getAttribute`.
- No `role` on the panel. Nav dropdowns stay lists of links; `aria-haspopup` is
  not added.
- `Escape` and light dismiss are native to `popover="auto"`.
- Focus: opening does **not** move focus into the panel; it inserts the panel
  into the sequential focus order after the invoker. Closing by keyboard —
  `Escape` — returns focus to the invoker. Pointer light-dismiss leaves focus
  where the pointer put it, and closing via a link click must not pull focus
  back to a trigger on the page being navigated away from.
- The trigger element constraint is in D2.

## Tokens

Panel surface reuses the existing contract — `bg-surface`, `rounded-card`,
`shadow-raised`, `--duration-expand`. No new token unless the fallback sheet
needs its own max height, in which case it is a literal, not a token, until a
second consumer disagrees.

## Testing

Vitest, on what jsdom can observe:

- `popovertarget` on the trigger equals the panel's `id`.
- Panel carries `popover="auto"`; anchor pair is `--{id}` on both sides.
- Trigger clone preserves the caller's `className`, `onClick` and other props,
  and **merges** rather than replaces a caller `style`.
- An omitted `id` produces a valid CSS identifier; an explicit one is used
  verbatim.
- `placement` maps to the expected `position-area` value; default is
  `bottom-start`.
- Rest props and `className` land on the panel, not the trigger; a caller
  `onClick` on the panel still fires.
- Link dismissal, per the D6 contract: closes on a plain click on an `<a href>`
  and on a click on an element nested inside one; does not close for a
  non-link, a modified click, `target="_blank"`, `download`, or a click whose
  default was prevented.
- A fragment or multi-node trigger throws a clear error.

Not testable in jsdom, and stated rather than faked: the top layer, light
dismiss, `Escape`, anchor positioning, `@starting-style`, and the `@supports`
fallback. jsdom's coverage of the Popover API is itself unconfirmed — if
`hidePopover` is absent, the handler test stubs it and the limitation is
documented.

## Risks and open questions

- **The App Router navigation behaviour behind D6 is reasoned, not observed.**
  Verify it in the template before writing the handler; if client-side
  navigation does dismiss the panel on its own, D6 collapses and `Popover`
  becomes a server component.
- **`cloneElement` cannot guarantee what it clones.** A custom component as
  trigger may swallow `popovertarget` silently. The runtime check catches
  fragments and multi-node elements, not a component that accepts props and
  drops them.
- **The `@supports` fallback has never been seen.** No engine available here
  lacks `position-area`, so the sheet layout can only be forced artificially.
  The `Disclosure` matrix has the same shape of gap for real Safari 18.x.
- **Trigger cloning is the one unfashionable choice.** `cloneElement` is stable
  in React 19 but discouraged; it is confined to a single element and the
  alternative shapes cost the RSC status or the wiring guarantee.

## Non-goals

- `Menu` — deferred per D1, and not the same component.
- Hover-to-open. The platform has none, it needs intent timers, and it is
  hostile on touch. fgpfister inherits it from Radix; that is a library default,
  not an estate decision.
- A separate mobile mode. The D4 fallback already renders a sheet, and nuwa's
  mobile pattern is `Disclosure`, which ships.
- Tooltips, context menus, select/combobox. Different keyboard contracts.
- `::backdrop` dimming. No usage in the estate dims behind a dropdown.
- Nested popovers. They work (D2), and no usage needs them; the spec neither
  supports nor prevents them.
