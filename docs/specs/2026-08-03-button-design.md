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
| fgpfister.ch | 28 | `primary`, `secondary`, `white`, `outline-white`, `outline-primary` | explicit ring | prototype only |
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
3. **Only fgpfister handles disabled at all**, and only in
   `docs/design-prototype/` — a prototype stylesheet with no usage behind it.
   Counted across the shipped code: **ten disabled `<button>`s, zero disabled
   links.** An earlier draft of this spec read that prototype's
   `[aria-disabled="true"]` rule as proof the estate needed disabled links; it
   is not, and D3 turns on this distinction.
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
- `disabled` maps to the native attribute where it means something, and errors
  in development where it does not (D3).
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

### D3 — `disabled` works on a real `<button>` only

An earlier draft of this spec had `disabled` fall back to `aria-disabled="true"`
on a rendered link, with activation suppressed by `pointer-events: none`. That
was wrong on two counts, and external review caught both.

**It would have announced a lie.** `aria-disabled` means *not operable*.
`pointer-events` stops the mouse but not the keyboard, so the control would have
told assistive technology it was unavailable while remaining fully operable —
for exactly the users who were told otherwise. An incomplete implementation of a
state is one thing; contradicting the state you publish is another.

**And it could not have been implemented reliably anyway.** With
`render={<SbLink …/>}` the component cannot know what element finally appears.
Stripping `href` fixes a literal `<a>` — an anchor without `href` is neither
focusable nor activatable — but `next/link` requires `href` and attaches its own
click handler, so the fix does not generalise to the case the prop exists for.

The evidence says the case does not exist. Across all five projects: **zero
disabled links, ten disabled `<button>`s.** The `[aria-disabled="true"]` rule in
fgpfister's stylesheet, cited by that earlier draft as proof the estate needed
this, is in `docs/design-prototype/` and has no usage behind it — a prototype,
read as a requirement.

So:

- Rendering a real `<button>`, with or without `render`: the native `disabled`
  attribute, and nothing else. The platform removes it from the tab order and
  blocks activation, mouse and keyboard alike. No JavaScript, no ARIA.
- `disabled` together with a non-button `render`: a development-only
  `console.error` naming the element, and the attribute is not applied. The
  message says what to do instead — do not render the link.

The component never sets `aria-disabled`, and never sets `disabled` on something
that would ignore it.

This deletes the client boundary the earlier draft was arguing about. `Button`
is a server component because nothing in it needs a handler, not because a hole
was tolerated to keep it one.

### D4 — A rendered `<button>` is a button

`render={<button className="…" />}` is a legitimate call — a caller wrapping
their own button element. It takes the default branch's treatment in full:
`type="button"` unless the caller sets `type`, and native `disabled`. Without
this, a rendered literal button inside a `<form>` defaults to `type="submit"`
and submits it, which is precisely the footgun D1 exists to prevent.

Detection is by `render.type === 'button'`, which is reliable for an intrinsic
element and impossible for a custom component. A custom component that renders a
`<button>` is treated as a link — it gets no `type` and no `disabled` — and the
D3 error message tells the caller so. This limit is inherent to `render` and is
documented rather than papered over.

### D5 — The focus ring needs a token

```css
&:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

An earlier draft used `currentColor`, reasoning that the ring would adapt to the
consumer's text colour. That reasoning was wrong: `outline-offset` draws the
ring *outside* the control, against the page, not against the button. A primary
button with white text on a white page produces a white ring on white — an
invisible focus indicator, which is the one failure a focus ring cannot have.

`--color-focus` joins the token contract (`tokens.ts`, `tokens.css`, the README
table), defaulting to `--color-primary`: visible against a typical page
background by construction, and brand-controllable in one line. Under
`forced-colors`, the UA's own indicator takes over.

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

The `:focus-visible` ring from D5 joins this block; together they are the whole
stylesheet. There is no disabled rule at all — a native disabled `<button>`
needs no CSS to stop working, and its appearance is the consumer's.

`text-decoration: none` exists because the component renders links; without it
every `Button` rendered as an anchor is underlined by the UA.

Deliberately absent: `font-weight`, `padding`, `border-radius`, `background`,
`color`, `box-shadow`, `transition` and disabled `opacity`. Every one of those
differs across the five projects, and the layering rules make a package default
something the consumer must fight rather than something they can build on.

The layer argument assumes the consumer's Tailwind entry declares the standard
layer order, which `@import "tailwindcss"` does. A consumer who establishes a
different order, or who imports this stylesheet unlayered into their own
cascade, changes which side wins — that is their call to make, and the README
states the assumption.

## API

Extending the full set of `<button>` props would let `formAction`, `name`,
`value` and `form` reach an anchor, while `href` could never be passed at all.
The shared surface is therefore explicit and small; anything element-specific
belongs on the element the caller passes to `render`.

```ts
export type ButtonProps = {
  children: ReactNode
  /** Render as something else — next/link, an SbLink, a plain <a>.
      Cloned, not wrapped. Element-specific props (href, target, ref …) go
      on this element, not on Button. */
  render?: ReactElement
  /** Native attribute. A no-op with a non-button `render`, which errors in
      development — see D3. */
  disabled?: boolean
  /** Only meaningful without `render`, or with `render={<button/>}`. */
  type?: 'button' | 'submit' | 'reset'
  className?: string
  /** Applies to the default <button>. With `render`, put the ref on your
      own element — cloneElement replaces a ref rather than composing it. */
  ref?: Ref<HTMLButtonElement>
} & Pick<
  ComponentPropsWithoutRef<'button'>,
  'id' | 'onClick' | 'onFocus' | 'onBlur' | 'title' | 'tabIndex' | 'style'
> &
  AriaAttributes &
  DataAttributes
```

The merge contract, property by property, because two sources exist for each
and "the caller's props are preserved" does not say who wins:

| Property | Rule |
| --- | --- |
| `className` | `cn(ours, render's, Button's)` — all three survive |
| `style` | shallow-merged, `render`'s own values last |
| `onClick` | both run: `Button`'s first, then `render`'s; neither is dropped |
| `children` | `Button`'s `children` replace the render element's, which are ignored |
| `type` | set only for a real `<button>`, and only if the caller did not |
| `disabled` | set only for a real `<button>` (D3) |
| everything else | `render`'s own props win — it is their element |

- Without `render`: `<button type="button" class="sankara-button …">`.
- With `render`: the given element, carrying `class="sankara-button …"`, and no
  `type` unless it is a literal `<button>` (D4).
- `className` order in the attribute has no effect on the cascade — the caller's
  utilities win because `.sankara-button` sits in `@layer components`, below
  `@layer utilities`.
- A fragment, an array, or a non-element `render` throws with a clear message.
  A custom component that swallows props cannot be detected; it renders
  unstyled and unwired, which the README documents.

## Accessibility

- An icon-only button needs an accessible name from the consumer
  (`aria-label`); the component cannot invent one and does not try.
- Disabled state comes from the native attribute, which the platform exposes to
  assistive technology, removes from the tab order, and refuses to activate. The
  component adds no ARIA of its own (D3).
- The focus ring is `:focus-visible`, so it appears for keyboard users without
  ringing every mouse click. Its visibility against a real page background is a
  browser check, not a jsdom one (see Testing).
- Nothing here sets `role`. A `<button>` is a button and a link is a link, and
  the estate's habit of styling links as buttons does not change what they are.
- **Nested interactive content is the caller's responsibility.** An anchor
  inside a button, or a button inside a rendered link, is invalid HTML and
  breaks keyboard and AT behaviour. `children` are rendered as given, and no
  runtime check can catch the custom-component cases, so this is documented
  rather than enforced.

## Tokens

One added: `--color-focus`, defaulting to `var(--color-primary)`, per D5. It
joins `TOKENS` in `tokens.ts`, the `@theme` block in `tokens.css`, and the
README table — `tokens.test.ts` fails if any of the three falls out of sync.

`gap: 0.5rem` stays a literal: a structural constant, not a design decision,
matching the treatment of `60svh` and `0.25rem` in the popover rules.

## Testing

Vitest, on the contract that breaks silently:

- Default renders a `<button>` with `type="button"`; an explicit `type="submit"`
  survives.
- `render` produces the caller's element, not a `<button>`, and adds no `type`.
- `render={<button/>}` gets `type="button"` and native `disabled` (D4).
- The clone preserves the caller's `className`, `style` and arbitrary props, and
  adds `sankara-button` alongside them.
- Both `onClick` handlers run, `Button`'s first, and the render element's own
  handler is not dropped.
- `Button`'s `children` replace the render element's.
- `disabled` on a real button: the native attribute, and no `aria-disabled`
  anywhere.
- `disabled` with a non-button `render`: `console.error` in development, no
  `disabled` and no `aria-disabled` attribute applied.
- A fragment, an array, or a non-element `render` throws a clear error.
- A custom component that swallows props renders unstyled — asserted so the
  limitation is pinned rather than discovered.
- The stylesheet keeps `.sankara-button` inside `@layer components` — covered by
  the existing layering invariant in `tokens.test.ts`.

Each assertion proven by mutation: break the line it covers, watch that test
fail by name, restore.

Not testable in jsdom, and stated rather than faked: `:focus-visible` ring
rendering, and its contrast against a real page background. Both belong in the
browser pass, together with a `forced-colors` check.

## Verification

Run 2026-08-03 against the Task 3 Storybook build (`Button--Default`,
`Button--AsLink`, `Button--Submit`, `Button--Disabled`), on **Chrome
150.0.7871.115 on macOS 26.5.2** — confirmed via
`navigator.userAgentData.getHighEntropyValues`, not the `navigator.userAgent`
string alone. One engine only; see below for what this does not cover.

Two automation paths were needed, both against the same Chrome build, for the
same reason `Popover`'s verification needed them: the `claude-in-chrome`
extension's automated tab reports `visibilityState: "hidden"`, and
`:focus-visible` in this Chrome build does **not** match a plain
programmatic `.focus()` — confirmed directly (see the first row below), so
every focus-dependent check used real, OS-level `Tab`/`Enter`/click input
dispatched through the `computer` tool, never `element.focus()` or a
synthetic `dispatchEvent`. `forced-colors: active` has no equivalent in that
extension's `emulate` surface, so a Playwright-controlled page of the same
Chrome build (`page.emulateMedia({ forcedColors: 'active' })`) was used for
that one check only.

One methodology error surfaced and is recorded rather than hidden: an early
disabled-button test called both `b.click()` and
`b.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}))` in
the same pass and read `clicked: true`. Isolating the two calls showed
`b.click()` alone correctly did nothing; the manual `dispatchEvent` was the
cause, because dispatching a synthetic event straight at an element delivers
it to listeners regardless of `disabled` — the platform's disabled-guard
applies to genuine activation (`click()`, a real click, a real key press), not
to a script handing an event object directly to `dispatchEvent`. The
retest below used only `.click()` and a real OS-level click, neither of which
fired the handler.

| Check | Chrome 150 |
| --- | --- |
| Programmatic `.focus()` does not satisfy `:focus-visible` | fail-as-expected — `b.focus()`: `activeElement` was the button, `b.matches(':focus-visible')` was `false`, `outline-style: none`. Confirms the brief's warning; real keyboard input was used for every check below instead |
| Real keyboard `Tab` focus matches `:focus-visible` and produces the ring | pass — after a real `Tab` keypress: `matches(':focus-visible')` `true`, `outline-color: oklch(0.55 0.22 275)`, `outline-width: 2px`, `outline-style: solid`, `outline-offset: 2px` |
| Ring visible against the **page**, not just the button (D5's central concern) | pass, both buttons in `Default` — primary (`bg-primary`, indigo): ring `oklch(0.55 0.22 275)` vs `background-color: oklch(0.55 0.22 275)` (button) vs page background; secondary (bordered, transparent bg): ring `oklch(0.55 0.22 275)` vs `background-color: rgba(0,0,0,0)` (button) vs `border-color: oklch(0.55 0.02 275)` (muted grey). `getComputedStyle(document.body).backgroundColor` is `rgba(0, 0, 0, 0)` on both — the Storybook iframe sets no explicit page background — so the ring was also checked against the *rendered* pixel colour, not just the computed style: screenshots of both focus states (below) show a solid indigo ring sitting clearly outside each button's edge against the rendered-white canvas. No collision in either case |
| Token resolution | `--color-focus: oklch(55% .22 275)`, `--color-primary: oklch(55% .22 275)` — equal, as D5 specifies |
| `forced-colors: active` still shows a focus indicator | pass (Playwright, same Chrome build) — `matchMedia('(forced-colors: active)').matches` `true`; button forced to `background-color: rgb(255, 255, 255)`, `color: rgb(0, 0, 0)` (Canvas/CanvasText); focus outline still present: `outline-style: solid`, `outline-width: 2px`, `outline-offset: 2px`, `outline-color: rgba(5, 0, 73, 0.8)` — distinct from the forced white button background |
| `button--disabled`: not focusable by keyboard | pass — real `Tab` from a blank click skipped the button entirely; `document.activeElement` stayed on `<body>` |
| `button--disabled`: does not fire on `.click()` | pass (isolated) — `b.click()` alone: click handler did not run |
| `button--disabled`: does not fire on a real, trusted mouse click | pass — OS-level click at the button's coordinates: click handler did not run |
| `button--disabled`: exposed as disabled | pass — `disabled: true`, `getAttribute('disabled') === ''`, `matches(':disabled')` `true`, `getAttribute('aria-disabled')` `null` (D3: native attribute only, no ARIA) |
| `button--as-link`: renders an `<a>` carrying `sankara-button` | pass — `tagName: "A"`, `className: "sankara-button rounded-card bg-primary px-5 py-2.5 font-medium text-primary-contrast"`, `href="#kontakt"` |
| `button--as-link`: not underlined | pass — `text-decoration-line: none` |
| `button--as-link`: activates on `Enter` | pass — real `Tab` to the link, then real `Enter`: tab URL gained `#kontakt` |
| `button--submit`: `type="submit"` button submits the form | pass — real OS-level click on "Absenden": the form's `submit` listener count went from 0 to 1 |
| `button--submit`: the plain button does not submit | pass — real OS-level click on "Zurücksetzen (kein submit)": the button received focus (confirming the click landed), submit listener count stayed at 0 |

Two full-page screenshots were taken during the real-`Tab`-focus checks above
(not saved into the repo, viewed inline during the run) confirming the ring
visually: the primary (indigo-filled) button showed a solid indigo ring
sitting outside its edge against the white page, and the secondary
(white, grey-bordered) button showed the same indigo ring outside its edge
against the same white page. Neither ring blended into the button it
surrounded or the page behind it.

**Unobserved, explicitly:**

- Real Safari and real Firefox — one engine only, as above. `outline` and
  `:focus-visible` are broadly interoperable, but the forced-colors palette
  in particular (`AccentColor`/`ButtonText` equivalents) is UA- and OS-defined
  and was only observed in Chromium's own approximation.
- A real screen-reader session. This run inspected the accessibility-relevant
  attributes directly (`disabled`, `aria-disabled`, `:disabled`), never an
  actual AT's announcement.
- The AT announcement of the disabled state — D3 argues from the platform
  contract (native `disabled` is exposed, removed from the tab order, and
  blocked from activation), not from hearing a screen reader announce it on
  this button.
- `render={<button/>}` (D4) and a custom-component `render` — the Storybook
  stories only exercise the default `<button>` and a plain `<a>`; the D4
  branch and the "custom component swallows props" case are covered by the
  Vitest suite, not this browser pass.
- High-contrast/forced-colors on an actual Windows machine with a real user
  contrast theme — the Playwright `emulateMedia` result matches the media
  query and one Chromium-computed approximation of the palette, not an OS
  reference implementation.

Nothing here contradicts a decision in this document. The one result worth
calling out is the first row: `:focus-visible` genuinely does not match a
bare `.focus()` in this Chrome build, which is exactly why the brief insisted
on real keyboard input for this check — a verification pass that used
`.focus()` alone would have wrongly reported no ring at all.

## Risks and open questions

- **`cloneElement` cannot guarantee what it clones.** A custom component that
  accepts props and drops them silently produces a button with no classes and no
  wiring. The runtime guard catches fragments, arrays and non-elements only.
  This is the standing cost of `render`, shared with `Popover`'s `trigger`.
- **A custom component that renders a `<button>` is treated as a link** (D4):
  no `type`, no `disabled`, and the D3 error if `disabled` is passed. Detection
  is impossible before render. If this bites a real consumer, the fix is an
  explicit prop naming what the element is, not deeper inference.
- **No `variant` prop — open, with criteria.** All five projects name the same
  variants (`primary` in three, `secondary` in four), which is real signal that
  the vocabulary is shared even though the values are not. External review
  proposed accepting `variant` and emitting `data-variant` for consumers to
  style. The counter-argument is that such a prop only re-encodes what
  `className="btn btn-primary"` already says, and adds public API that has to be
  versioned. Deferred, and to be reopened when either holds: a second consumer
  needs to *switch* variants dynamically (where a prop beats string
  concatenation), or the template needs to map a CMS field to a variant and
  would otherwise build its own lookup.
- **Typography is deliberately not in this spec.** The same sweep found no
  `Typography` or `Heading` component in any project; four of five have a
  `richtext` class for CMS output, which is a stylesheet concern with four
  different type scales behind it. It needs its own evidence review.

## Non-goals

- `variant`, `size`, colour props, and icon-only sizing — skin, per D1.
- Loading and pending states. No usage in the estate, and it needs a client
  boundary.
- Disabled links. Not supported, by decision, per D3.
- Button groups, split buttons, toggle buttons.
- Replacing the projects' `btn` classes. This component composes with them.
