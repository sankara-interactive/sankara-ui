# Form primitives — Design

`Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`.

Status: design approved in conversation 2026-08-13; not yet implemented.

## Problem

Nothing in `@sankara-ui/core` handles input. Every project that ships a form has
grown its own, and the three that have one disagree on almost everything: the
markup, the label placement, the error rendering, and — decisively — the form
library underneath.

## Evidence base

Surveyed 2026-08-13 across the five projects the package's catalogue derives
from.

| Project | Form? | Library | Text | Checkbox | Radio | Select |
| --- | --- | --- | --- | --- | --- | --- |
| fairmed.ch-sb | yes | react-hook-form | `TextField` | own | own | — |
| fgpfister.ch | yes | conform | `TextField` (`multiline`) | — | — | — |
| numbers.ch | yes | none, raw native | native | — | — | — |
| brillen-werk.ch | no | — | — | radio-as-UI in `SegmentedControl` | — | — |
| nuwa.swiss | no | — | — | — | — | one native `<select>`, a filter |

Two corrections to the originating survey in
`next-storyblok-template/docs/superpowers/specs/2026-07-29-sankara-ui-design.md`:

1. **The "Checkbox 16, RadioGroup 13, Listbox 11" frequency counts overstate
   demand.** fgpfister.ch contains zero occurrences of any of the three. All 31
   identifier hits are in fairmed.ch-sb, concentrated in three files:
   `Checkbox.tsx` and `RadioGroup.tsx` counting their own definitions and
   internal uses, plus `LanguageSwitcher.tsx` using Headless UI's `Listbox` —
   a language switcher, not a form field. The counts measure identifier
   repetition inside a handful of files, not distinct usage across projects.
2. **`Select` has no supporting evidence at all.** The single `<select>` in the
   estate (nuwa.swiss `location-sidebar.tsx`) is a filter control, not a form
   field.

The pattern that genuinely repeats, in all three form-bearing projects, is
narrower than six components: a labelled text control that renders its own error
message, with textarea folded into it rather than separate. Both structured
projects converged on exactly that — fairmed via `type`, fgpfister via
`multiline`.

The full six are built anyway, by explicit decision (D1). This section records
what the evidence does and does not support so the decision stays legible.

## Decisions

### D1 — Six components, as the roadmap lists them

`Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`. The narrower
evidence-driven scope (`Field` + one `TextField`) was considered and rejected in
favour of roadmap fidelity.

Accepted costs, recorded rather than argued: `Select` ships without a consumer
that needs it, and the `Input`/`Textarea` split contradicts the consolidation
both structured projects independently arrived at. If `Select` has no consumer
by the time a second project adopts the package, delete it rather than maintain
it.

### D2 — Server components; the id comes from `name`

None of the six declares `'use client'`. A page with a form ships no JavaScript
from this package, matching `Icon`, `Disclosure` and `Dialog`.

That forbids `useId`, which is a client-only hook. The id defaults to the
required `name` prop, with an optional `id` override — the approach
fairmed.ch-sb already uses (`id={name}`).

Ceiling, and the reason `id` is overridable: two forms on one page carrying the
same field name produce duplicate ids. Pass `id` explicitly there. The
alternative — `'use client'` on all six — costs the RSC property on every page
with a form, to fix a collision that is rare and locally fixable.

### D3 — Label and error are props on the control; `Field` is also exported

Each control takes `label`, `description` and `error` and renders them itself.
This is what all three projects hand-rolled, and it keeps the common call site
to one element.

`Field` is the shared implementation underneath and is exported, for controls
the package does not have. Its `children` is a render prop:

```tsx
<Field name="colour" label="Farbe" error={e}>
  {({ id, describedBy, invalid }) => (
    <ThirdPartyPicker id={id} aria-describedby={describedBy} aria-invalid={invalid} />
  )}
</Field>
```

A render prop rather than `cloneElement` (the `Button`/`Popover` idiom) or
context: `cloneElement` silently does nothing when the child does not forward
`aria-*`, and context would require a client component, breaking D2. The render
prop is explicit, costs nothing at runtime, and works in an RSC.

### D4 — Form-library agnostic; rest props win

The two projects with real forms use incompatible libraries — react-hook-form
(`UseFormRegisterReturn`, `FieldError`) and conform (`getInputProps`,
`FieldMetadata`) — and the third uses none. No library's types may appear in
this package, and no adapter is written for either.

The controls are uncontrolled native elements. Every prop not consumed by the
component is forwarded to the element, and the merge order is
`{...derivedDefaults} {...restProps}` — **rest props override the derived `id`,
`aria-describedby` and `aria-invalid`**. `className` is the exception and merges.

That single rule makes all three consumer styles work unchanged:

```tsx
<Input name="email" label="E-Mail" {...register('email')} />        // react-hook-form
<Input label="E-Mail" {...getInputProps(field, {type:'email'})} />  // conform
<Input name="email" label="E-Mail" required />                      // no library
```

Conform supplies its own `id`, `aria-invalid` and `aria-describedby` pointing at
its own error element; because rest props win, it keeps them, and the consumer
simply does not pass `error`.

### D5 — `layout` is a class, not a second code path

`Field` takes `layout?: 'stacked' | 'inline'`. Both render the same DOM —
`<label for={id}>`, the control, then the messages — and `layout` only selects a
class that changes visual order and alignment.

`Checkbox` is therefore `Field` with `layout="inline"` and no structural
divergence. Nesting the control inside the `<label>` for the inline case was
rejected: it would fork the markup, and a sibling `<label for>` in a flex row is
equivalent for both the accessibility tree and the click target.

### D6 — `RadioGroup` is the one structural exception

A radio group's accessible name comes from `<fieldset>`/`<legend>`, not
`<label for>`, so `RadioGroup` cannot reuse `Field`'s label element. It renders
its own fieldset and reuses only the description and error parts.

`aria-describedby` goes on the fieldset. Each radio gets `id={`${id}-${value}`}`.

### D7 — `RadioGroup` takes `items`; `Select` takes `children`

Asymmetric on purpose. `Select` accepts `<option>`/`<optgroup>` children because
that is the native API and it handles grouping for free; a `placeholder` prop is
not offered because a placeholder is `<option value="">`. Radios have no
equivalent native container, so `RadioGroup` takes an array:

```tsx
items: { value: string; label: ReactNode; disabled?: boolean }[]
```

The shape is fairmed.ch-sb's, unchanged. The asymmetry tracks a real difference
in the platform rather than an inconsistency in the package.

### D8 — Form controls ship a surface, superseding Button's D6 for controls only

`2026-08-03-button-design.md` D6 rules that the stylesheet carries structure
only, and that `padding`, `border-radius`, `background` and `color` are
deliberately absent because they differ across projects.

That rule stands for `Button`, `Dialog` and `Popover`. It is reversed here, for
the form controls only:

- A borderless `<button>` is unstyled; a borderless `<input>` is **invisible**.
  Tailwind preflight zeroes `border-width` on every element, so a package that
  ships no surface ships a control the user cannot see or locate.
- Six controls repeated across every form on every site is precisely the drift
  the package exists to stop. `Dialog` and `Popover` are one-off surfaces a
  consumer designs deliberately; a text input is not.
- The default is expressed in the same tokens a consumer would otherwise type by
  hand (`--color-surface`, `--color-muted`, `--radius-card`), so overriding the
  token gets the right result without touching a class.

**Counter-evidence, recorded because it is real:** the three projects' input
surfaces do differ — fairmed uses a background and no border, fgpfister and
numbers use a border and no background, and the padding and radius differ in all
three. fairmed's floating-label design is structurally incompatible with any
default padding and will have to opt out of it. D6's original argument therefore
holds in part, and this decision accepts that some consumers override the
default outright rather than build on it. The judgement is that an invisible
control is the worse failure.

Overriding is cheap because of D9: one utility per property, winning by layer
order.

### D9 — Every default lives in `tokens.css`, never as a JSX utility

The package styles through two channels, and only one of them is overridable.

**Overridable —** semantic classes in `tokens.css` under `@layer components`.
Tailwind's layer order puts `utilities` after `components`, so any consumer
utility wins regardless of specificity, with no `!important` and no specificity
war. This is the documented architecture.

**Not reliably overridable —** Tailwind utilities emitted inline in JSX, which
`Carousel`, `Disclosure` and `FaIcon` do today:

```
Carousel.tsx:74   cn('sankara-carousel flex flex-col gap-6', className)
Disclosure.tsx:49 'flex cursor-pointer list-none items-center justify-between gap-4'
FaIcon.tsx:36     cn(classes, 'inline-flex shrink-0 items-center justify-center …', className)
```

These compile into `@layer utilities` — the consumer's own layer. `cn` is a
plain join, not `tailwind-merge`:

```ts
export function cn(...classes) { return classes.filter(Boolean).join(' ') }
```

so both the package's `gap-6` and a consumer's `gap-2` survive into the class
attribute at equal specificity in one layer, and the winner is decided by order
in the compiled stylesheet — which Tailwind sorts canonically and the consumer
cannot influence. Class-attribute order has no effect. The documented
`className` escape hatch may therefore silently fail for any property the
component already sets.

The form primitives put every default in `tokens.css`. The existing components
should follow (see Follow-up).

### D10 — Error state is never signalled by colour alone

`error` always renders a text message element and sets `aria-invalid`. The
stylesheet adds no red border as the sole cue. Same rule as the richtext link
underline, for the same reason.

## API

Shared by `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`:

```tsx
name: string              // required; the id source
label: ReactNode          // required; a control without one is a bug
id?: string               // override when name collides
description?: ReactNode   // hint text, wired into aria-describedby
error?: ReactNode         // presence flips aria-invalid
className?: string        // merged, never replaced
```

`Field`:

```tsx
type FieldProps = {
  name: string
  label: ReactNode
  id?: string
  description?: ReactNode
  error?: ReactNode
  className?: string
  layout?: 'stacked' | 'inline'   // default 'stacked'
  children: (wiring: {
    id: string
    describedBy: string | undefined
    invalid: true | undefined
  }) => ReactNode
}
```

`Input` — `ComponentPropsWithoutRef<'input'>` plus the shared props, with `type`
narrowed to exclude `'checkbox' | 'radio'`. Those have their own components and
the type system should say so.

`Textarea` — `ComponentPropsWithoutRef<'textarea'>` plus shared. `rows` defaults
to 5; both structured projects independently chose 5.

`Checkbox` — `Field` with `layout="inline"` and `<input type="checkbox">`.

`RadioGroup` — `items` per D7, plus `defaultValue?: string`, on a `<fieldset>`.

`Select` — `ComponentPropsWithoutRef<'select'>` plus shared; `<option>` children
pass straight through.

`ref` is a plain prop on all five controls, matching `Button` under React 19.

## Accessibility

- `<label for={id}>` on every control; `getByLabelText` resolving is the
  acceptance test for correct wiring.
- `aria-describedby` composes description and error ids, omitting whichever is
  absent, and is `undefined` when both are.
- `aria-invalid` is set only when `error` is present.
- `RadioGroup` names itself with `<legend>` and carries `aria-describedby` on the
  fieldset.
- Focus ring on `:focus-visible` only, using `--color-focus`, matching `Button`'s
  D5.
- Error is text, never colour alone (D10).

## Tokens

Two new, both following the `--carousel-dot` precedent of a component token
defaulting to a global:

| Token | Default | Why |
| --- | --- | --- |
| `--color-error` | `oklch(0.55 0.19 25)` | No danger colour exists in `TOKENS`; the error text needs one. A literal, not a `var()` — there is no global to derive it from, and `tokens.test.ts` fails any entry without a CSS default |
| `--field-accent` | `var(--color-primary)` | Native checkbox/radio otherwise render browser-blue and ignore the brand |

The control surface reuses existing globals directly — `--color-surface`,
`--color-muted`, `--radius-card` — rather than inventing `--field-surface` and
friends. `--carousel-dot` was invented because "dot colour" has no global
equivalent; surface, border and radius all do.

Three places stay in sync per the package rule: `TOKENS` in `src/styles/tokens.ts`,
the `@theme` block in `src/styles/tokens.css`, and the README table.
`tokens.test.ts` enforces it.

## Stylesheet

`@layer components`, in `tokens.css`:

```css
.sankara-field { display: flex; flex-direction: column; gap: 0.375rem; }
.sankara-field-inline { flex-direction: row; align-items: center; gap: 0.75rem; }
.sankara-field-control {
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: var(--radius-card);
  padding: 0.5rem 0.75rem;
}
.sankara-field-control:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.sankara-field-checkbox, .sankara-field-radio { accent-color: var(--field-accent); }
.sankara-field-error { color: var(--color-error); }
```

## Testing

Component tests in jsdom, plus `field-css.test.ts` reading `tokens.css`, matching
the existing split.

- `getByLabelText` resolves for all five controls
- `aria-describedby` composes both ids, holds one when only one is present, and is
  absent when neither is
- `aria-invalid` appears only with `error`
- **rest props override the derived `id` and `aria-*`** — this is D4, and the
  library-agnostic claim rests on it
- `className` merges rather than replaces
- `RadioGroup` emits `<fieldset>`/`<legend>`, per-item ids, `aria-describedby` on
  the fieldset
- `Select` passes `<optgroup>` through intact
- `Input` rejects `type="checkbox"` — a typecheck assertion, not a runtime test
- CSS: focus ring present, `accent-color` reads `--field-accent`, error carries a
  text message rather than colour alone

Stories: one per component, plus one full form rendered three ways —
react-hook-form, conform, and no library. That triple is the design constraint
and should be visible in the workbench.

## Follow-up — close channel B on the existing components

Independent of forms, and shippable separately. `Carousel`, `Disclosure` and
`FaIcon` emit Tailwind utilities inline (D9), so their `className` escape hatch
is unreliable. Two fixes:

- **Add `tailwind-merge`** — fixes `cn` properly, at the cost of the package's
  first runtime dependency. "Seven components, zero runtime deps" is a stated
  property worth keeping.
- **Move the inline utilities into `tokens.css` semantic classes** —
  `.sankara-carousel`, `.sankara-disclosure-summary`, `.sankara-icon` absorb what
  is currently inline. No dependency, and every component lands in the
  overridable channel.

Recommended: the second. Verify the failure against a real compiled build first —
the mechanism is certain, but which side Tailwind's canonical sort favours for
any given property pair is not.

### Closed, 2026-08-13 — measured, then moved

Compiled against Tailwind 4.3.3 (`@tailwindcss/postcss`, unoptimised) with the
package's classes and a consumer's overrides in one build. Emission order within
`@layer utilities`, later wins:

| Package | Consumer | Winner |
| --- | --- | --- |
| `gap-6` | `gap-2` | **package** — override fails |
| `gap-6` | `gap-4` | **package** — override fails |
| `gap-6` | `gap-8` | consumer |
| `inline-flex` | `flex` | **package** — override fails |
| `shrink-0` | `shrink` | **package** — override fails |
| `flex-col` | `flex-row` | consumer |

Each utility family sorts by ascending value, so the escape hatch works only
where the consumer's value happens to sort later — about half the cases, with no
way for a consumer to tell which. Confirms the mechanism and the fix.

Taken: the second option. `Carousel`, `Disclosure` and `FaIcon` now carry only
`sankara-*` classes; the defaults moved into `tokens.css` under
`@layer components`. Re-compiled to confirm the outcome — every moved rule lands
in `@layer components`, every consumer utility in `@layer utilities`, and the
emitted `@layer theme, base, components, utilities;` statement decides the
cascade (the utilities block is emitted *physically first*, which is exactly why
the layer statement, not source order, is what makes this safe).

`src/components/inline-utilities.test.ts` is the regression guard: it fails on
any non-`sankara-*` class literal in a component's `className`.

`src/styles/layer-order.test.ts` proves the outcome rather than the text: it
compiles Tailwind and `tokens.css` together the way a consumer does and asserts
which layer each selector landed in. It is the only test here that would catch a
broken `@import`, an invalid declaration, or a layer regression.

**`Dialog`, measured after the fact, and folded in.** The assumption that its
prop-keyed `SIZES` map was the hard part was wrong — that map is the part that
already worked:

| Package | Consumer | Winner |
| --- | --- | --- |
| `max-w-sm` | `max-w-xs` | consumer |
| `max-w-sm` | `max-w-xl` | consumer |
| `max-w-3xl` | `max-w-xl` | consumer |
| `m-auto` | `m-0`, `m-4` | **package** — override fails |
| `ms-auto` | `ms-0` | **package** — override fails |
| `h-dvh` | `h-auto` | **package** — override fails |
| `max-h-dvh` | `max-h-96` | **package** — override fails |
| `overflow-y-auto` | `overflow-visible` | **package** — override fails |
| `w-[min(20rem,85vw)]` | `w-80` | **package** — override fails |

The broken half is the fixed geometry, not the prop-keyed part. Sizes became
`.sankara-dialog-sm/-md/-lg` — a `max-inline-size` when centred, an
`inline-size` when docked, via `.sankara-dialog-end.sankara-dialog-{size}`. The
centred `max-w-*` map moved too, though it was not broken: leaving it inline
would keep `Dialog` on the guard's exclusion list, and a hole in that guard is
how this returns. Verified in Chrome across all six placement/size pairs, and
the five failing overrides above now win.

One deliberate exclusion remains:

- **`Icon`** keeps `inline-block shrink-0` inline. It ships from the `./icon`
  subpath, where a consumer may never have imported `styles.css`; moving them
  would break its layout outright rather than merely make an override unreliable.

Known limit of the guard: a class list built in a module-level constant and
passed by identifier is not inspected. `Dialog`'s `SIZES` is that shape.

## Risks and open questions

- **D8 against the evidence.** All three projects' input surfaces differ from
  each other and from the proposed default. Some consumers will override it
  wholesale rather than build on it, and fairmed's floating-label padding is
  incompatible outright. Accepted (D8); revisit if the second adopting project
  also overrides everything.
- **`Select` has no consumer.** Delete rather than maintain if that is still true
  when a second project adopts.
- **Duplicate ids** when two forms on one page share field names (D2). Mitigated
  by the `id` prop, not prevented.
- **Conform's `aria-describedby`** points at its own error element. Correct under
  D4, but a consumer who passes *both* conform's props and this package's `error`
  gets two error elements with only conform's announced. Document it.

## Non-goals

- No validation, schema, or submission handling. The form library owns all three.
- No adapter for react-hook-form or conform.
- No custom listbox. `Select` is a native `<select>`; the native-first rule and
  the retired Base UI decision (`D3`, retired in the 0.6 integration) both point
  there, and no evidence asks for more.
- No file input, date picker, combobox, or switch. None appears in the survey.
