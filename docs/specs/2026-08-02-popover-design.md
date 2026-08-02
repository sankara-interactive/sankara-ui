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

The invoker must be the declarative `popovertarget` attribute, never
`showPopover()` from JavaScript. Per MDN, the declarative form sets up an
implicit `aria-expanded` and `aria-details` relationship between invoker and
popover; the imperative form with a `source` option changes focus navigation
only, without the ARIA mapping. brillen-werk's hand-written
`aria-haspopup="menu"` is therefore both redundant and the wrong role for a
list of links.

### D3 — Caller-supplied `id`, valid as a CSS identifier

The `id` is the `popovertarget`, the panel's `id`, and both halves of the anchor
pair (`anchor-name: --{id}` / `position-anchor: --{id}`). Four things that must
agree, which is the wiring worth owning.

`useId` cannot supply it. It is a hook, so it would force a client boundary for
id generation alone, and React's generated ids contain characters that are not
valid CSS identifiers, so `--{useId()}` is not a usable `anchor-name`.
brillen-werk builds its anchor name exactly that way; its dropdown may be
silently unanchored and merely *looking* right because it sits near the top of
the viewport. **Unverified** — worth checking, but not a claim this spec relies
on.

Consumers already have stable ids (`blok._uid`), the same source `Disclosure`'s
`name` draws on. Document the two constraints: document-unique, and a valid CSS
identifier.

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

Behind `@supports (position-area: bottom)`: `position-area` from `placement`,
plus `position-try-fallbacks: flip-block, flip-inline` so a panel near a
viewport edge flips instead of clipping.

Without support: a full-bleed sheet pinned to the bottom of the viewport, with a
max height and its own scroll. The fallback is a deliberate layout, not an
approximation of an anchored one — the panel is never mispositioned, only
presented differently, and a bottom sheet is the familiar pattern on the phones
where Safari 18 predominantly lives.

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

### D7 — Trigger open-state exposed as a Tailwind variant

The platform gives the invoker no open-state hook for CSS, and all three nav
dropdowns in the estate rotate a chevron on the trigger. Because the panel is
the trigger's next sibling, `:has(+ [popover]:popover-open)` reaches it.

Ship it as a `@custom-variant` in `tokens.css` so consumers write
`popover-open:rotate-180` on their chevron:

```css
@custom-variant popover-open (&:has(+ [popover]:popover-open));
```

**Spike before relying on this:** confirm a `@custom-variant` declared in an
imported package stylesheet is picked up by the consumer's Tailwind v4 build. If
it is not, the fallback is documenting the raw `:has()` selector in the README,
and nothing else in the design changes.

### D8 — Animation mirrors `Dialog`

`@starting-style` plus `transition-behavior: allow-discrete` on `display` and
`overlay`, driven by `--duration-expand`, disabled under
`prefers-reduced-motion`. Engines without `@starting-style` show the panel
instantly, which is the same degradation `Dialog` documents.

## API

```ts
type PopoverProps = {
  /** Document-unique, and a valid CSS identifier. Drives popovertarget,
      the panel id, and the anchor pair. */
  id: string
  /** Rendered as-is; cloned to add popovertarget and anchor-name. */
  trigger: ReactElement
  /** position-area keyword. Default 'bottom-start'. */
  placement?:
    | 'bottom-start' | 'bottom' | 'bottom-end'
    | 'top-start' | 'top' | 'top-end'
  /** Panel classes. */
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'id' | 'className' | 'children'>
```

Remaining props land on the panel. The trigger keeps its own props; the
component adds only `popovertarget` and the `anchor-name` style.

Panel width is the caller's (`w-72` in fgpfister, `md:w-96` in fairmed,
`xl:w-[800px]` in nuwa) — no `size` prop.

## Accessibility

- `aria-expanded` and `aria-details` on the trigger come from the declarative
  invoker relationship (D2). The component adds neither, and must not.
- No `role` on the panel. Nav dropdowns stay lists of links; `aria-haspopup` is
  not added.
- `Escape` and light dismiss are native to `popover="auto"`.
- Focus returns to the invoker on dismiss, per the popover focus contract.
- The trigger must be a `<button>` or an `<input>`; `popovertarget` has no
  effect on an `<a>`. Document it.

## Tokens

Panel surface reuses the existing contract — `bg-surface`, `rounded-card`,
`shadow-raised`, `--duration-expand`. No new token unless the fallback sheet
needs its own max height, in which case it is a literal, not a token, until a
second consumer disagrees.

## Testing

Vitest, on what jsdom can observe:

- `popovertarget` on the trigger equals the panel's `id`.
- Panel carries `popover="auto"`; anchor pair is `--{id}` on both sides.
- Trigger clone preserves the caller's `className`, `onClick` and other props.
- `placement` maps to the expected `position-area` value; default is
  `bottom-start`.
- Rest props and `className` land on the panel, not the trigger.
- A click on an `<a href>` inside the panel calls `hidePopover`; a click on a
  non-link inside it does not.

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
- **The `@custom-variant` export in D7 is unverified.** Spike it first; the
  fallback is documentation.
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
