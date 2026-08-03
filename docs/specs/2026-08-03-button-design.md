# `Button` — Design

Date: 2026-08-03
Status: draft, pending implementation
Scope: Tier 3 of `next-storyblok-template/docs/enhancement-roadmap.md`, fourth
component after `Disclosure`, `Dialog` and `Popover`

## Problem

Every project in the estate has buttons; none has a `Button` component. All five
express them as CSS classes, and the class vocabulary is nearly identical while
the visual definitions share nothing. The parts that *are* shared — inline-flex
centring, a gap, the cursor, focus and disabled handling, and the
button-versus-link question — are re-solved per project, and not always
correctly.

## Evidence base

Class usage, counted across each repo's `.tsx` and `.css`:

| Project | `btn` | Variants present | Focus-visible | Disabled |
| --- | --- | --- | --- | --- |
| fairmed.ch-sb | 83 | `primary`, `icon`, `contrast-primary`, `secondary`, `link` | — | — |
| fgpfister.ch | 28 | `primary`, `secondary`, `white`, `outline-white`, `outline-primary` | explicit ring | `:disabled` + `[aria-disabled]` |
| brillen-werk.ch | 9 | `primary`, `secondary`, `icon`, `contrast` | — | — |
| numbers.ch | 3 | `accent`, `arrow` | — | — |
| nuwa.swiss | 4 | `link` | — | — |

Four findings:

1. **Nobody wrote a component.** Five projects, five stylesheets, zero
   `Button.tsx`. The roadmap lists `Button` under Tier 3 as if it were an
   unextracted component; it is an unextracted *class contract*.
2. **The structure is shared; the skin is not.** Every definition is
   inline-flex, centred, with a gap, a font weight, `cursor: pointer` and a
   transition. Then brillen-werk is `rounded-2xl` with a shadow and
   `hover:scale-105`, and fgpfister is square-cornered with a border that
   inverts on hover. There is no shared visual language to extract.
3. **Only fgpfister handles disabled**, and it handles both `:disabled` and
   `[aria-disabled="true"]` — evidence that the estate already needs the
   link-shaped disabled case, not just the button-shaped one.
4. **The variant vocabulary is consistent** (`primary` in three, `secondary` in
   four, `icon` and `link` in two each) but the variants are pure skin. Shipping
   them as props would ship colour decisions the package cannot make.

## Decisions

### D1 — Correctness, not appearance

`Button` ships what a consumer cannot easily get right, and nothing they would
have to override:

- `type="button"` by default, so a button inside a form does not submit it. This
  is not hypothetical — `Popover`'s spec had to document the same footgun for
  its trigger.
- One prop switches between a real `<button>` and any link element.
- `disabled` stays correct for whichever of those is rendered (D3).
- A focus ring that does not depend on the consumer remembering one.

No `variant`, no `size`, no colour. This is the direct consequence of the
`@layer components` finding: package CSS that ships appearance beats the
consumer's own utilities unless carefully layered, and even layered, a visual
default is something every project would immediately override. Four different
brands, four different buttons.

### D2 — `render` for polymorphism; no framework or CMS dependency

```tsx
<Button>Speichern</Button>
<Button render={<Link href="/kontakt" />}>Kontakt</Button>
<Button render={<SbLink link={blok.link} />}>{blok.label}</Button>
```

The consumer passes the element; the component clones it, merges its own classes
and props in, and renders it in place of the `<button>`. `next/link` is never
imported, and nothing Storyblok is — CMS adaptation stays the template's job,
and four of the five projects already have an `SbLink` helper that resolves a
Storyblok link object.

Rejected: a generic `as` prop, which needs the target component's type imported
and degrades badly in React 19; and separate `Button`/`ButtonLink` exports,
which duplicate every prop and every future change.

The cloning cost is known, having been paid in `Popover`: `cloneElement` merges
props shallowly, so `className` and `style` must be merged by hand or the
caller's are silently replaced; a fragment must be rejected explicitly; and a
custom component must forward unknown props to a real element, which cannot be
enforced. The same guards and the same tests apply here.

### D3 — `disabled` splits by what is rendered

A disabled `<a>` does not exist in HTML. The attribute is ignored, and the link
stays clickable and focusable.

- Rendering a real `<button>`: the native `disabled` attribute, and nothing
  else. The platform removes it from the tab order and blocks activation.
- Rendering anything else: `aria-disabled="true"`, no `disabled` attribute, and
  the element stays focusable so screen-reader users can still find it. `.45`
  opacity and other visual treatments stay with the consumer.

The component never sets both, and never sets `aria-disabled` on a real button,
where it would duplicate a state the platform already exposes.

### D4 — Activation suppressed in CSS; `Button` stays a server component

Suppressing activation on an `aria-disabled` link needs a click handler, and a
handler means `'use client'` on the package's most-used component — JavaScript
on essentially every page in the estate, for a state most buttons never enter.
`Disclosure`'s D2 established the principle; this follows it.

`pointer-events: none` on `[aria-disabled="true"]` blocks the mouse, which is
what fgpfister already ships.

**The documented hole:** `pointer-events` does not stop keyboard activation, so
`Enter` on a focused disabled link still navigates. This is accepted, not
overlooked. It requires `render` *and* `disabled` together, and for a link,
unavailability is usually better expressed by not rendering the link at all. A
disabled `<button>` — the common case — needs no JavaScript, because the
platform handles it.

Revisit if a real usage needs a genuinely disabled link; the fix is a client
boundary, and it can be a separate export rather than a cost on every button.

### D5 — The focus ring uses `currentColor`, not a token

```css
&:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
```

`currentColor` adapts to whatever text colour the consumer sets, so a ring on a
dark primary button and one on a light secondary both work without the package
knowing either colour. It adds nothing to the token contract, which has to stay
in sync across `tokens.ts`, `tokens.css` and the README.

A `--color-focus` token would give brand-controlled rings, and is the obvious
upgrade if a project wants one. It is not needed to ship, and an unused token is
a worse default than none.

### D6 — The stylesheet carries structure only

`.sankara-button`, in `@layer components` alongside the other three components:

```css
display: inline-flex;
align-items: center;
justify-content: center;
gap: 0.5rem;
cursor: pointer;
text-decoration: none;
```

The `:focus-visible` ring from D5 and the disabled rules from D4 join this block;
together those three are the whole stylesheet.

`text-decoration: none` exists because the component renders links; without it
every `Button` rendered as an anchor is underlined by the UA.

Deliberately absent: `font-weight`, `padding`, `border-radius`, `background`,
`color`, `box-shadow`, `transition` and disabled `opacity`. Every one of those
differs across the five projects, and the layering rules make a package default
something the consumer must fight rather than something they can build on.

## API

```ts
export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  children: ReactNode
  /** Render as something else — next/link, an SbLink, a plain <a>.
      Cloned, not wrapped. */
  render?: ReactElement
  /** Native attribute on a <button>; aria-disabled on anything else. */
  disabled?: boolean
}
```

- Without `render`: `<button type="button" class="sankara-button …">`. `type` is
  overridable for real submit buttons.
- With `render`: the given element, carrying `class="sankara-button …"`, the
  caller's own props preserved, and no `type` attribute added.
- `className` merges via `cn`, the component's class first, the caller's after.
  Order in the attribute has no effect on the cascade — the caller's utilities
  win because `.sankara-button` sits in `@layer components`, below
  `@layer utilities`.
- `ref` reaches whichever element is rendered — under React 19 it rides along as
  an ordinary prop, as in `Disclosure`.

## Accessibility

- An icon-only button needs an accessible name from the consumer
  (`aria-label`); the component cannot invent one and does not try.
- `aria-disabled` is announced as "dimmed"/"unavailable" while the control stays
  reachable — the reason D3 prefers it to removing the element from the tab
  order.
- The focus ring is `:focus-visible`, so it appears for keyboard users without
  ringing every mouse click.
- Nothing here sets `role`. A `<button>` is a button and a link is a link, and
  the estate's habit of styling links as buttons does not change what they are.

## Tokens

None added. `gap: 0.5rem` is a structural constant, not a design decision, and
matches the treatment of `60svh` and `0.25rem` in the popover rules.

## Testing

Vitest, on the contract that breaks silently:

- Default renders a `<button>` with `type="button"`; an explicit `type="submit"`
  survives.
- `render` produces the caller's element, not a `<button>`, and adds no `type`.
- The clone preserves the caller's `className`, `style`, `ref` and arbitrary
  props, and adds `sankara-button` alongside them.
- `disabled` on a real button: native `disabled`, no `aria-disabled`.
- `disabled` with `render`: `aria-disabled="true"`, no `disabled` attribute.
- A fragment or multi-node `render` throws a clear error.
- The stylesheet keeps `.sankara-button` inside `@layer components` — covered by
  the existing layering invariant in `tokens.test.ts`.

Each assertion proven by mutation: break the line it covers, watch that test
fail by name, restore.

Not testable in jsdom, and stated rather than faked: `:focus-visible` ring
rendering and `pointer-events: none` suppression.

## Risks and open questions

- **The keyboard hole in D4 is a deliberate trade**, and the first real
  complaint about it should reopen the decision rather than be worked around in
  a consumer.
- **`cloneElement` cannot guarantee what it clones.** A custom component that
  accepts props and drops them silently produces a button with no classes and no
  wiring. The runtime guard catches fragments and multi-node elements only.
- **No `variant` prop will be missed.** Consumers write `className="btn
  btn-primary"` or their own utilities, exactly as all five projects do now. If
  a second consumer independently reinvents the same variant *values*, that is
  evidence for tokens, not for props.
- **Typography is deliberately not in this spec.** The same sweep found no
  `Typography` or `Heading` component in any project; four of five have a
  `richtext` class for CMS output, which is a stylesheet concern with four
  different type scales behind it. It needs its own evidence review.

## Non-goals

- `variant`, `size`, colour props, and icon-only sizing — skin, per D1.
- Loading and pending states. No usage in the estate, and it needs a client
  boundary.
- Button groups, split buttons, toggle buttons.
- Replacing the projects' `btn` classes. This component composes with them.
