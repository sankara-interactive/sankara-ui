# Form Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup` and `Select` in `@sankara-ui/core` as server components that work with react-hook-form, conform, or no form library at all.

**Architecture:** `Field` owns the label/description/error markup and the id and ARIA wiring, and hands that wiring to a render-prop child. The five controls each wrap `Field` and render one native element. Nothing declares `'use client'`; the id derives from the required `name` prop because `useId` is a client-only hook. Every visual default lives in `tokens.css` under `@layer components`, never as an inline Tailwind utility, so consumer utilities win by layer order.

**Tech Stack:** React 19, TypeScript (`module: nodenext`, `verbatimModuleSyntax`), Tailwind v4, vitest + jsdom + @testing-library/react, Storybook 10, changesets.

**Spec:** `docs/specs/2026-08-13-form-primitives-design.md`

## Global Constraints

- **No `'use client'` in any of the six files.** D2. `useId` is forbidden; the id is `props.id ?? props.name`.
- **Relative imports carry the `.js` extension** even from `.ts` sources — `../utilities/cn.js`, `./Field.js`. Extensionless imports fail typecheck.
- **No new runtime dependencies.** The package has zero and keeps zero. No `tailwind-merge`, no form-library packages.
- **No form-library types.** `UseFormRegisterReturn`, `FieldError`, `FieldMetadata` must not appear anywhere in `src/`.
- **Rest props override derived defaults.** Merge order is always `{...derivedDefaults} {...restProps}`. D4.
- **No inline Tailwind utilities in the new JSX.** Every class the components emit is a `sankara-*` class defined in `tokens.css`. D9.
- **`className` targets the control; `fieldClassName` targets the wrapper.** Both merge via `cn`, never replace.
- **Tokens stay in sync in three places:** `TOKENS` in `src/styles/tokens.ts`, the `@theme` block in `src/styles/tokens.css`, and the README table. `tokens.test.ts` enforces the first two.
- **Every user-facing change needs a changeset** committed alongside it.
- Gate before any PR: `yarn check` (typecheck + test + build).

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/Field.tsx` | Wrapper markup, id/ARIA derivation, `layout`. Exports `Field`, `fieldWiring`, `FieldProps`, `FieldWiring`, `SharedFieldProps` |
| `src/components/Input.tsx` | `<input>` with `type` narrowed against checkbox/radio |
| `src/components/Textarea.tsx` | `<textarea>`, `rows` defaults to 5 |
| `src/components/Checkbox.tsx` | `<input type="checkbox">` via `Field layout="inline"` |
| `src/components/RadioGroup.tsx` | `<fieldset>`/`<legend>` + N radios. The one file that does not use `Field` |
| `src/components/Select.tsx` | `<select>` with children passed through |
| `src/styles/tokens.ts` | Add `--color-error`, `--field-accent` |
| `src/styles/tokens.css` | `@theme` defaults + `@layer components` block |
| `src/styles/field-css.test.ts` | Asserts the stylesheet contract |
| `src/index.ts` | Barrel exports |
| `README.md` | Token rows + a Forms section |

---

### Task 1: Tokens and stylesheet

**Files:**
- Modify: `src/styles/tokens.ts`
- Modify: `src/styles/tokens.css`
- Modify: `README.md` (token table)
- Test: `src/styles/field-css.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS classes `sankara-field`, `sankara-field-inline`, `sankara-field-label`, `sankara-field-control`, `sankara-field-description`, `sankara-field-error`, `sankara-field-checkbox`, `sankara-field-radio`, `sankara-field-radio-item`. Tokens `--color-error`, `--field-accent`.

- [ ] **Step 0: Create the working branch**

Feature branches only; never commit on `main`.

```bash
git checkout main && git pull --ff-only
git checkout -b feat/form-primitives
```

- [ ] **Step 1: Write the failing stylesheet test**

Create `src/styles/field-css.test.ts`:

```ts
// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const ruleFor = (selector: string) =>
  css.match(new RegExp(`\\${selector} \\{[^}]*}`, 's'))?.[0]

describe('field stylesheet', () => {
  it('declares both new tokens in @theme', () => {
    const theme = css.match(/@theme \{[^}]*}/s)?.[0]
    expect(theme).toContain('--color-error:')
    expect(theme).toContain('--field-accent: var(--color-primary)')
  })

  it('stacks by default and reorders inline without changing DOM order', () => {
    expect(ruleFor('.sankara-field')).toContain('flex-direction: column')
    const inline = ruleFor('.sankara-field-inline')
    expect(inline).toContain('flex-direction: row')
    // The label follows the control in the DOM only visually -- order, not markup.
    expect(css).toMatch(/\.sankara-field-inline > \.sankara-field-label \{[^}]*order: 2/s)
  })

  it('gives the control a visible surface from existing globals', () => {
    const control = ruleFor('.sankara-field-control')
    expect(control).toContain('background: var(--color-surface)')
    expect(control).toContain('border: 1px solid var(--color-muted)')
    expect(control).toContain('border-radius: var(--radius-card)')
  })

  it('rings on focus-visible only, from the shared focus token', () => {
    const ring = css.match(/\.sankara-field-control:focus-visible \{[^}]*}/s)?.[0]
    expect(ring).toContain('outline: 2px solid var(--color-focus)')
    expect(ring).toContain('outline-offset: 2px')
  })

  it('tints native checkbox and radio with the brand accent', () => {
    expect(css).toMatch(
      /\.sankara-field-checkbox,\s*\.sankara-field-radio \{[^}]*accent-color: var\(--field-accent\)/s
    )
  })

  it('colours the error text but never uses colour as the only cue', () => {
    expect(ruleFor('.sankara-field-error')).toContain('color: var(--color-error)')
    // No border/background recolouring of the control on error -- the message element is the cue.
    expect(css).not.toMatch(/\[aria-invalid\][^{]*\{[^}]*border-color/s)
  })

  it('ships the field rules inside @layer components so consumer utilities win', () => {
    const layers = css.match(/@layer components \{/g)
    expect(layers).toBeTruthy()
    const fieldIndex = css.indexOf('.sankara-field {')
    const layerStarts = [...css.matchAll(/@layer (\w+) \{/g)]
    const enclosing = layerStarts.filter(m => m.index! < fieldIndex).pop()
    expect(enclosing?.[1]).toBe('components')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/styles/field-css.test.ts`
Expected: FAIL — every assertion, because none of the rules or tokens exist yet.

- [ ] **Step 3: Add the tokens to `src/styles/tokens.ts`**

Append two entries to the `TOKENS` array, after `'--carousel-dot-active'`:

```ts
  '--color-error',
  '--field-accent',
```

- [ ] **Step 4: Add the `@theme` defaults**

In `src/styles/tokens.css`, inside the existing `@theme { … }` block, after `--carousel-dot-active`:

```css
  --color-error: oklch(0.55 0.19 25);
  --field-accent: var(--color-primary);
```

`--color-error` is a literal because no existing global expresses danger; `--field-accent` derives from the brand colour the way `--color-focus` does.

- [ ] **Step 5: Add the stylesheet block**

Append to `src/styles/tokens.css`, after the existing `.sankara-button` block's closing `}`:

```css
/* Form controls. Unlike .sankara-button and .sankara-popover, these DO carry a
   surface -- see the form spec's D8. A borderless <button> is merely unstyled;
   Tailwind preflight zeroes border-width on every element, so a borderless
   <input> is invisible, and six controls repeated across every form on every
   site is exactly the drift this package exists to prevent. The default is
   spelled in the same globals a consumer would otherwise type by hand, and
   @layer components means one utility per property overrides any of it. */
@layer components {
  .sankara-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  /* Inline is a class, not a second code path (D5): the DOM stays
     label -> control -> messages in both layouts, and `order` alone moves the
     label after the control. Nesting the input inside the <label> would fork
     the markup for no accessibility gain -- a sibling <label for> is an
     equivalent name and an equivalent click target. */
  .sankara-field-inline {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .sankara-field-inline > .sankara-field-label {
    order: 2;
  }

  .sankara-field-inline > .sankara-field-description,
  .sankara-field-inline > .sankara-field-error {
    order: 3;
    flex-basis: 100%;
  }

  .sankara-field-control {
    background: var(--color-surface);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius-card);
    padding: 0.5rem 0.75rem;
  }

  .sankara-field-control:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* Native controls render browser-blue and ignore the brand without this. */
  .sankara-field-checkbox,
  .sankara-field-radio {
    accent-color: var(--field-accent);
  }

  .sankara-field-radio-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sankara-field-description {
    color: var(--color-muted);
  }

  /* Colour is not the only cue (D10): the message element itself is the signal,
     so nothing here recolours the control's border on aria-invalid. */
  .sankara-field-error {
    color: var(--color-error);
  }
}
```

- [ ] **Step 6: Add the README token rows**

In `README.md`, add to the token table, keeping the existing column order:

```markdown
| `--color-error` | Error message text |
| `--field-accent` | Native checkbox and radio accent colour |
```

- [ ] **Step 7: Run the tests**

Run: `yarn vitest run src/styles/field-css.test.ts src/styles/tokens.test.ts`
Expected: PASS. `tokens.test.ts` must also pass — it fails any `TOKENS` entry lacking a CSS default.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.ts src/styles/tokens.css src/styles/field-css.test.ts README.md
git commit -m "Add the form field tokens and stylesheet"
```

---

### Task 2: `Field`

**Files:**
- Create: `src/components/Field.tsx`
- Test: `src/components/Field.test.tsx`
- Create: `src/components/Field.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: the CSS classes from Task 1; `cn` from `../utilities/cn.js`.
- Produces:
  - `type FieldWiring = { id: string; describedBy: string | undefined; invalid: true | undefined }`
  - `type SharedFieldProps = { name: string; label: ReactNode; id?: string; description?: ReactNode; error?: ReactNode; className?: string; fieldClassName?: string }`
  - `function fieldWiring(input: { name: string; id?: string; description?: ReactNode; error?: ReactNode }): FieldWiring & { descriptionId: string; errorId: string }`
  - `function Field(props: FieldProps): ReactNode`

  Tasks 3–7 import `Field`, `fieldWiring` and `SharedFieldProps` from `./Field.js`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Field.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field, fieldWiring } from './Field.js'

describe('fieldWiring', () => {
  it('derives the id from name and falls back to an explicit id', () => {
    expect(fieldWiring({ name: 'email' }).id).toBe('email')
    expect(fieldWiring({ name: 'email', id: 'contact-email' }).id).toBe('contact-email')
  })

  it('composes describedBy from whichever messages are present', () => {
    expect(fieldWiring({ name: 'a' }).describedBy).toBeUndefined()
    expect(fieldWiring({ name: 'a', description: 'hint' }).describedBy).toBe('a-description')
    expect(fieldWiring({ name: 'a', error: 'bad' }).describedBy).toBe('a-error')
    expect(fieldWiring({ name: 'a', description: 'hint', error: 'bad' }).describedBy).toBe(
      'a-description a-error'
    )
  })

  it('flags invalid only when an error is present', () => {
    expect(fieldWiring({ name: 'a' }).invalid).toBeUndefined()
    expect(fieldWiring({ name: 'a', error: 'bad' }).invalid).toBe(true)
  })
})

describe('Field', () => {
  it('associates the label with the control the render prop builds', () => {
    render(
      <Field name="colour" label="Farbe">
        {({ id }) => <input id={id} />}
      </Field>
    )
    expect(screen.getByLabelText('Farbe')).toBeInTheDocument()
  })

  it('hands the wiring to the child and renders the message elements with matching ids', () => {
    render(
      <Field name="colour" label="Farbe" description="Ihre Wahl" error="Pflichtfeld">
        {({ id, describedBy, invalid }) => (
          <input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
    )
    const control = screen.getByLabelText('Farbe')
    expect(control).toHaveAttribute('aria-describedby', 'colour-description colour-error')
    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Ihre Wahl')).toHaveAttribute('id', 'colour-description')
    expect(screen.getByText('Pflichtfeld')).toHaveAttribute('id', 'colour-error')
  })

  it('keeps DOM order label -> control -> messages in both layouts', () => {
    const { container, rerender } = render(
      <Field name="a" label="L" error="E">
        {({ id }) => <input id={id} data-testid="c" />}
      </Field>
    )
    const domOrder = () =>
      [...container.querySelectorAll('.sankara-field > *')].map(n => n.tagName.toLowerCase())
    expect(domOrder()).toEqual(['label', 'input', 'p'])

    rerender(
      <Field name="a" label="L" error="E" layout="inline">
        {({ id }) => <input id={id} data-testid="c" />}
      </Field>
    )
    expect(domOrder()).toEqual(['label', 'input', 'p'])
    expect(container.querySelector('.sankara-field')).toHaveClass('sankara-field-inline')
  })

  it('merges fieldClassName onto the wrapper rather than replacing it', () => {
    const { container } = render(
      <Field name="a" label="L" fieldClassName="col-span-full">
        {({ id }) => <input id={id} />}
      </Field>
    )
    const wrapper = container.querySelector('.sankara-field')
    expect(wrapper).toHaveClass('sankara-field')
    expect(wrapper).toHaveClass('col-span-full')
  })

  it('omits the message elements entirely when neither is given', () => {
    const { container } = render(
      <Field name="a" label="L">
        {({ id }) => <input id={id} />}
      </Field>
    )
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/Field.test.tsx`
Expected: FAIL — `Cannot find module './Field.js'`.

- [ ] **Step 3: Implement `Field`**

Create `src/components/Field.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

export type FieldWiring = {
  id: string
  describedBy: string | undefined
  invalid: true | undefined
}

/** The props every control in this package shares. `className` targets the
    control element; `fieldClassName` targets the wrapper. Splitting them is
    what fairmed.ch-sb's `containerClassName` was reaching for -- one prop
    cannot mean both, and the control is the far more common target. */
export type SharedFieldProps = {
  name: string
  label: ReactNode
  id?: string
  description?: ReactNode
  error?: ReactNode
  className?: string
  fieldClassName?: string
}

export type FieldProps = Omit<SharedFieldProps, 'className'> & {
  layout?: 'stacked' | 'inline'
  children: (wiring: FieldWiring) => ReactNode
}

/** Exported so each control derives ids identically, and so RadioGroup -- which
    cannot use Field, because its name comes from <legend> -- still shares the
    derivation rather than reimplementing it. */
export function fieldWiring({
  name,
  id,
  description,
  error,
}: Pick<SharedFieldProps, 'name' | 'id' | 'description' | 'error'>): FieldWiring & {
  descriptionId: string
  errorId: string
} {
  // No useId: that is a client-only hook and these are server components (D2).
  // Ceiling: two forms on one page sharing a field name collide -- pass `id`.
  const resolvedId = id ?? name
  const descriptionId = `${resolvedId}-description`
  const errorId = `${resolvedId}-error`
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  return {
    id: resolvedId,
    describedBy,
    invalid: error ? true : undefined,
    descriptionId,
    errorId,
  }
}

export function Field({
  name,
  label,
  id,
  description,
  error,
  fieldClassName,
  layout = 'stacked',
  children,
}: FieldProps) {
  const { descriptionId, errorId, ...wiring } = fieldWiring({ name, id, description, error })

  return (
    <div
      className={cn(
        'sankara-field',
        layout === 'inline' && 'sankara-field-inline',
        fieldClassName
      )}
    >
      <label className="sankara-field-label" htmlFor={wiring.id}>
        {label}
      </label>
      {children(wiring)}
      {description ? (
        <p className="sankara-field-description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="sankara-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/Field.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Export from the barrel**

In `src/index.ts`, add alongside the existing exports:

```ts
export { Field, fieldWiring } from './components/Field.js'
export type { FieldProps, FieldWiring, SharedFieldProps } from './components/Field.js'
```

- [ ] **Step 6: Add the story**

Create `src/components/Field.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Field } from './Field.js'

const meta: Meta<typeof Field> = {
  title: 'Forms/Field',
  component: Field,
}
export default meta

type Story = StoryObj<typeof Field>

export const EscapeHatch: Story = {
  render: () => (
    <Field name="colour" label="Farbe" description="Any control the package lacks">
      {({ id, describedBy, invalid }) => (
        <input
          className="sankara-field-control"
          type="color"
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <Field name="colour" label="Farbe" error="Bitte wählen Sie eine Farbe">
      {({ id, describedBy, invalid }) => (
        <input
          className="sankara-field-control"
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  ),
}
```

- [ ] **Step 7: Run the gate**

Run: `yarn check`
Expected: PASS — typecheck, all tests, build.

- [ ] **Step 8: Commit**

```bash
git add src/components/Field.tsx src/components/Field.test.tsx src/components/Field.stories.tsx src/index.ts
git commit -m "Add Field, the shared label/error/ARIA wrapper"
```

---

### Task 3: `Input`

**Files:**
- Create: `src/components/Input.tsx`
- Test: `src/components/Input.test.tsx`
- Create: `src/components/Input.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `Field`, `SharedFieldProps` from `./Field.js`; `cn` from `../utilities/cn.js`.
- Produces: `function Input(props: InputProps)`, `type InputProps`. Tasks 4–7 copy its prop-merge shape.

- [ ] **Step 1: Write the failing test**

Create `src/components/Input.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input.js'

describe('Input', () => {
  it('labels the control and derives id and name from `name`', () => {
    render(<Input name="email" label="E-Mail" />)
    const input = screen.getByLabelText('E-Mail')
    expect(input).toHaveAttribute('id', 'email')
    expect(input).toHaveAttribute('name', 'email')
  })

  it('wires description and error into aria-describedby and aria-invalid', () => {
    render(<Input name="email" label="E-Mail" description="Geschäftlich" error="Ungültig" />)
    const input = screen.getByLabelText('E-Mail')
    expect(input).toHaveAttribute('aria-describedby', 'email-description email-error')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets rest props override the derived id and ARIA -- the conform case', () => {
    // conform's getInputProps() supplies its own id and aria-* pointing at its
    // own error element. D4: rest props win, so those survive untouched.
    render(
      <Input
        name="email"
        label="E-Mail"
        error="ours"
        id="derived"
        {...{ id: 'conform-id', 'aria-describedby': 'conform-error', 'aria-invalid': true }}
      />
    )
    const input = screen.getByLabelText('E-Mail')
    expect(input).toHaveAttribute('id', 'conform-id')
    expect(input).toHaveAttribute('aria-describedby', 'conform-error')
  })

  it('forwards a spread name, as react-hook-form register() supplies', () => {
    render(<Input name="placeholder" label="E-Mail" {...{ name: 'email' }} />)
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('name', 'email')
  })

  it('merges className onto the control and fieldClassName onto the wrapper', () => {
    const { container } = render(
      <Input name="email" label="E-Mail" className="w-full" fieldClassName="col-span-full" />
    )
    expect(screen.getByLabelText('E-Mail')).toHaveClass('sankara-field-control', 'w-full')
    expect(container.querySelector('.sankara-field')).toHaveClass('col-span-full')
  })

  it('forwards the ref to the input element', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input name="email" label="E-Mail" ref={ref} />)
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('passes native validation attributes straight through', () => {
    render(<Input name="email" label="E-Mail" type="email" required maxLength={200} />)
    const input = screen.getByLabelText('E-Mail')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('maxlength', '200')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/Input.test.tsx`
Expected: FAIL — `Cannot find module './Input.js'`.

- [ ] **Step 3: Implement `Input`**

Create `src/components/Input.tsx`:

```tsx
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

/** checkbox and radio are excluded at the type level: they have their own
    components with structurally different markup, and <Input type="checkbox">
    would render a checkbox with a block label above it. */
type InputType = Exclude<ComponentPropsWithoutRef<'input'>['type'], 'checkbox' | 'radio'>

export type InputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'id' | 'className'
> &
  SharedFieldProps & {
    type?: InputType
    ref?: Ref<HTMLInputElement>
  }

export function Input({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
    >
      {({ id: controlId, describedBy, invalid }) => (
        <input
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          // Last: a form library's own id/name/aria must win (D4).
          {...props}
        />
      )}
    </Field>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/Input.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Verify the type narrowing holds**

Add this to `src/components/Input.test.tsx`, then confirm `yarn typecheck` fails, then delete it and confirm typecheck passes again:

```tsx
// @ts-expect-error checkbox has its own component
render(<Input name="x" label="X" type="checkbox" />)
```

With `@ts-expect-error` present the file must typecheck cleanly — that *is* the assertion that the type rejects it. Keep this line in the committed test.

Run: `yarn typecheck`
Expected: PASS with the `@ts-expect-error` line present. If it reports the directive is unused, the narrowing is broken.

- [ ] **Step 6: Export and add the story**

In `src/index.ts`:

```ts
export { Input } from './components/Input.js'
export type { InputProps } from './components/Input.js'
```

Create `src/components/Input.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input.js'

const meta: Meta<typeof Input> = { title: 'Forms/Input', component: Input }
export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = { args: { name: 'email', label: 'E-Mail', type: 'email' } }

export const WithDescription: Story = {
  args: { name: 'email', label: 'E-Mail', description: 'Wir schreiben Ihnen nur einmal.' },
}

export const WithError: Story = {
  args: { name: 'email', label: 'E-Mail', error: 'Bitte geben Sie eine gültige Adresse ein.' },
}
```

- [ ] **Step 7: Run the gate and commit**

Run: `yarn check`

```bash
git add src/components/Input.tsx src/components/Input.test.tsx src/components/Input.stories.tsx src/index.ts
git commit -m "Add Input"
```

---

### Task 4: `Textarea`

**Files:**
- Create: `src/components/Textarea.tsx`
- Test: `src/components/Textarea.test.tsx`
- Create: `src/components/Textarea.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `Field`, `SharedFieldProps` from `./Field.js`; `cn`.
- Produces: `function Textarea(props: TextareaProps)`, `type TextareaProps`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Textarea.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textarea } from './Textarea.js'

describe('Textarea', () => {
  it('labels the control and derives id and name from `name`', () => {
    render(<Textarea name="message" label="Nachricht" />)
    const control = screen.getByLabelText('Nachricht')
    expect(control.tagName).toBe('TEXTAREA')
    expect(control).toHaveAttribute('id', 'message')
    expect(control).toHaveAttribute('name', 'message')
  })

  it('defaults rows to 5 and lets the caller override it', () => {
    const { rerender } = render(<Textarea name="message" label="Nachricht" />)
    expect(screen.getByLabelText('Nachricht')).toHaveAttribute('rows', '5')
    rerender(<Textarea name="message" label="Nachricht" rows={12} />)
    expect(screen.getByLabelText('Nachricht')).toHaveAttribute('rows', '12')
  })

  it('wires description and error into aria-describedby and aria-invalid', () => {
    render(<Textarea name="message" label="Nachricht" description="Max 5000" error="Zu lang" />)
    const control = screen.getByLabelText('Nachricht')
    expect(control).toHaveAttribute('aria-describedby', 'message-description message-error')
    expect(control).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets rest props override the derived id and ARIA', () => {
    render(
      <Textarea
        name="message"
        label="Nachricht"
        error="ours"
        {...{ id: 'conform-id', 'aria-describedby': 'conform-error' }}
      />
    )
    const control = screen.getByLabelText('Nachricht')
    expect(control).toHaveAttribute('id', 'conform-id')
    expect(control).toHaveAttribute('aria-describedby', 'conform-error')
  })

  it('merges className onto the control and fieldClassName onto the wrapper', () => {
    const { container } = render(
      <Textarea name="message" label="Nachricht" className="w-full" fieldClassName="col-span-full" />
    )
    expect(screen.getByLabelText('Nachricht')).toHaveClass('sankara-field-control', 'w-full')
    expect(container.querySelector('.sankara-field')).toHaveClass('col-span-full')
  })

  it('forwards the ref to the textarea element', () => {
    const ref = { current: null as HTMLTextAreaElement | null }
    render(<Textarea name="message" label="Nachricht" ref={ref} />)
    expect(ref.current?.tagName).toBe('TEXTAREA')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/Textarea.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Textarea`**

Create `src/components/Textarea.tsx`:

```tsx
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

export type TextareaProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'className'> &
  SharedFieldProps & {
    ref?: Ref<HTMLTextAreaElement>
  }

export function Textarea({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  rows = 5,
  ...props
}: TextareaProps) {
  return (
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
    >
      {({ id: controlId, describedBy, invalid }) => (
        <textarea
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          // Both structured projects independently chose 5.
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        />
      )}
    </Field>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/Textarea.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Export and add the story**

In `src/index.ts`:

```ts
export { Textarea } from './components/Textarea.js'
export type { TextareaProps } from './components/Textarea.js'
```

Create `src/components/Textarea.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './Textarea.js'

const meta: Meta<typeof Textarea> = { title: 'Forms/Textarea', component: Textarea }
export default meta

type Story = StoryObj<typeof Textarea>

export const Default: Story = { args: { name: 'message', label: 'Nachricht' } }

export const WithError: Story = {
  args: { name: 'message', label: 'Nachricht', error: 'Bitte schreiben Sie uns etwas.' },
}
```

- [ ] **Step 6: Run the gate and commit**

Run: `yarn check`

```bash
git add src/components/Textarea.tsx src/components/Textarea.test.tsx src/components/Textarea.stories.tsx src/index.ts
git commit -m "Add Textarea"
```

---

### Task 5: `Checkbox`

**Files:**
- Create: `src/components/Checkbox.tsx`
- Test: `src/components/Checkbox.test.tsx`
- Create: `src/components/Checkbox.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `Field`, `SharedFieldProps` from `./Field.js`; `cn`.
- Produces: `function Checkbox(props: CheckboxProps)`, `type CheckboxProps`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Checkbox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox.js'

describe('Checkbox', () => {
  it('renders a checkbox labelled by its label prop', () => {
    render(<Checkbox name="agb" label="AGB akzeptieren" />)
    const box = screen.getByLabelText('AGB akzeptieren')
    expect(box).toHaveAttribute('type', 'checkbox')
    expect(box).toHaveAttribute('id', 'agb')
    expect(box).toHaveAttribute('name', 'agb')
  })

  it('uses the inline layout without changing DOM order', () => {
    const { container } = render(<Checkbox name="agb" label="AGB" error="Pflicht" />)
    const wrapper = container.querySelector('.sankara-field')
    expect(wrapper).toHaveClass('sankara-field-inline')
    expect([...wrapper!.children].map(n => n.tagName.toLowerCase())).toEqual([
      'label',
      'input',
      'p',
    ])
  })

  it('carries the accent class so the native control follows the brand', () => {
    render(<Checkbox name="agb" label="AGB" />)
    expect(screen.getByLabelText('AGB')).toHaveClass('sankara-field-checkbox')
  })

  it('wires description and error into aria-describedby and aria-invalid', () => {
    render(<Checkbox name="agb" label="AGB" description="Pflichtfeld" error="Bitte bestätigen" />)
    const box = screen.getByLabelText('AGB')
    expect(box).toHaveAttribute('aria-describedby', 'agb-description agb-error')
    expect(box).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets rest props override the derived id and ARIA', () => {
    render(
      <Checkbox
        name="agb"
        label="AGB"
        error="ours"
        {...{ id: 'conform-id', 'aria-describedby': 'conform-error' }}
      />
    )
    expect(screen.getByLabelText('AGB')).toHaveAttribute('id', 'conform-id')
  })

  it('forwards the ref and native checked state', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Checkbox name="agb" label="AGB" defaultChecked ref={ref} />)
    expect(ref.current?.checked).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/Checkbox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Checkbox`**

Create `src/components/Checkbox.tsx`:

```tsx
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

export type CheckboxProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'id' | 'type' | 'className'
> &
  SharedFieldProps & {
    ref?: Ref<HTMLInputElement>
  }

export function Checkbox({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  ...props
}: CheckboxProps) {
  return (
    // layout="inline" is the whole difference from Input -- a class, not a
    // second code path (D5). The DOM stays label -> control -> messages.
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
      layout="inline"
    >
      {({ id: controlId, describedBy, invalid }) => (
        <input
          className={cn('sankara-field-checkbox', className)}
          type="checkbox"
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        />
      )}
    </Field>
  )
}
```

Note: no `sankara-field-control` here — the surface rule is for text-entry
controls; a native checkbox draws itself and only needs the accent colour.

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/Checkbox.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Export and add the story**

In `src/index.ts`:

```ts
export { Checkbox } from './components/Checkbox.js'
export type { CheckboxProps } from './components/Checkbox.js'
```

Create `src/components/Checkbox.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox.js'

const meta: Meta<typeof Checkbox> = { title: 'Forms/Checkbox', component: Checkbox }
export default meta

type Story = StoryObj<typeof Checkbox>

export const Default: Story = { args: { name: 'agb', label: 'AGB akzeptieren' } }

export const WithError: Story = {
  args: { name: 'agb', label: 'AGB akzeptieren', error: 'Bitte bestätigen Sie die AGB.' },
}
```

- [ ] **Step 6: Run the gate and commit**

Run: `yarn check`

```bash
git add src/components/Checkbox.tsx src/components/Checkbox.test.tsx src/components/Checkbox.stories.tsx src/index.ts
git commit -m "Add Checkbox"
```

---

### Task 6: `RadioGroup`

**Files:**
- Create: `src/components/RadioGroup.tsx`
- Test: `src/components/RadioGroup.test.tsx`
- Create: `src/components/RadioGroup.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `fieldWiring` from `./Field.js` (not `Field` itself); `cn`.
- Produces: `function RadioGroup(props: RadioGroupProps)`, `type RadioGroupProps`, `type RadioGroupItem = { value: string; label: ReactNode; disabled?: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/RadioGroup.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RadioGroup } from './RadioGroup.js'

const ITEMS = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'post', label: 'Post', disabled: true },
]

describe('RadioGroup', () => {
  it('names the group with a fieldset and legend', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    const group = screen.getByRole('group', { name: 'Kontaktart' })
    expect(group.tagName).toBe('FIELDSET')
    expect(within(group).getByText('Kontaktart').tagName).toBe('LEGEND')
  })

  it('renders one labelled radio per item, sharing the group name', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    for (const item of ITEMS) {
      const radio = screen.getByLabelText(item.label)
      expect(radio).toHaveAttribute('type', 'radio')
      expect(radio).toHaveAttribute('name', 'kontakt')
      expect(radio).toHaveAttribute('value', item.value)
      expect(radio).toHaveAttribute('id', `kontakt-${item.value}`)
    }
  })

  it('honours per-item disabled and defaultValue', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} defaultValue="phone" />)
    expect(screen.getByLabelText('Post')).toBeDisabled()
    expect(screen.getByLabelText('Telefon')).toBeChecked()
    expect(screen.getByLabelText('E-Mail')).not.toBeChecked()
  })

  it('puts aria-describedby on the fieldset and aria-invalid on each radio', () => {
    render(
      <RadioGroup
        name="kontakt"
        label="Kontaktart"
        items={ITEMS}
        description="Wie erreichen wir Sie?"
        error="Bitte wählen"
      />
    )
    const group = screen.getByRole('group', { name: 'Kontaktart' })
    expect(group).toHaveAttribute('aria-describedby', 'kontakt-description kontakt-error')
    // aria-invalid goes on each radio, not the fieldset: the radio role
    // supports it unambiguously, group's support is not worth relying on.
    for (const item of ITEMS) {
      expect(screen.getByLabelText(item.label)).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('omits aria-describedby entirely when there are no messages', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby')
  })

  it('derives item ids from an explicit id when given', () => {
    render(<RadioGroup name="kontakt" id="form2-kontakt" label="Kontaktart" items={ITEMS} />)
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('id', 'form2-kontakt-mail')
  })

  it('merges className onto the fieldset', () => {
    const { container } = render(
      <RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} className="col-span-full" />
    )
    expect(container.querySelector('fieldset')).toHaveClass('sankara-field', 'col-span-full')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/RadioGroup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RadioGroup`**

Create `src/components/RadioGroup.tsx`:

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'
import { fieldWiring, type SharedFieldProps } from './Field.js'

export type RadioGroupItem = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export type RadioGroupProps = Omit<
  ComponentPropsWithoutRef<'fieldset'>,
  'id' | 'className' | 'children'
> &
  Omit<SharedFieldProps, 'fieldClassName'> & {
    items: RadioGroupItem[]
    defaultValue?: string
  }

/** The one control that cannot use Field: a radio group's accessible name comes
    from <legend> inside <fieldset>, not from <label for>. It shares the id
    derivation via fieldWiring and reuses the message classes, but owns its own
    wrapper markup. */
export function RadioGroup({
  name,
  label,
  id,
  description,
  error,
  className,
  items,
  defaultValue,
  ...props
}: RadioGroupProps) {
  const { id: groupId, describedBy, invalid, descriptionId, errorId } = fieldWiring({
    name,
    id,
    description,
    error,
  })

  return (
    <fieldset className={cn('sankara-field', className)} aria-describedby={describedBy} {...props}>
      <legend className="sankara-field-label">{label}</legend>
      {items.map(item => {
        const itemId = `${groupId}-${item.value}`
        return (
          <label className="sankara-field-radio-item" htmlFor={itemId} key={item.value}>
            <input
              className="sankara-field-radio"
              type="radio"
              id={itemId}
              name={name}
              value={item.value}
              defaultChecked={defaultValue === item.value}
              disabled={item.disabled}
              // Per radio, not on the fieldset: the radio role supports
              // aria-invalid unambiguously; group's support is not.
              aria-invalid={invalid}
            />
            <span>{item.label}</span>
          </label>
        )
      })}
      {description ? (
        <p className="sankara-field-description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="sankara-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/RadioGroup.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Export and add the story**

In `src/index.ts`:

```ts
export { RadioGroup } from './components/RadioGroup.js'
export type { RadioGroupItem, RadioGroupProps } from './components/RadioGroup.js'
```

Create `src/components/RadioGroup.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { RadioGroup } from './RadioGroup.js'

const meta: Meta<typeof RadioGroup> = { title: 'Forms/RadioGroup', component: RadioGroup }
export default meta

type Story = StoryObj<typeof RadioGroup>

const items = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
]

export const Default: Story = { args: { name: 'kontakt', label: 'Kontaktart', items } }

export const WithError: Story = {
  args: { name: 'kontakt', label: 'Kontaktart', items, error: 'Bitte wählen Sie eine Kontaktart.' },
}
```

- [ ] **Step 6: Run the gate and commit**

Run: `yarn check`

```bash
git add src/components/RadioGroup.tsx src/components/RadioGroup.test.tsx src/components/RadioGroup.stories.tsx src/index.ts
git commit -m "Add RadioGroup"
```

---

### Task 7: `Select`

**Files:**
- Create: `src/components/Select.tsx`
- Test: `src/components/Select.test.tsx`
- Create: `src/components/Select.stories.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `Field`, `SharedFieldProps` from `./Field.js`; `cn`.
- Produces: `function Select(props: SelectProps)`, `type SelectProps`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Select.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Select } from './Select.js'

describe('Select', () => {
  it('labels the control and derives id and name from `name`', () => {
    render(
      <Select name="thema" label="Thema">
        <option value="a">A</option>
      </Select>
    )
    const select = screen.getByLabelText('Thema')
    expect(select.tagName).toBe('SELECT')
    expect(select).toHaveAttribute('id', 'thema')
    expect(select).toHaveAttribute('name', 'thema')
  })

  it('passes options and optgroups through untouched', () => {
    render(
      <Select name="thema" label="Thema">
        <option value="">Bitte wählen</option>
        <optgroup label="Support">
          <option value="bug">Fehler</option>
        </optgroup>
      </Select>
    )
    const select = screen.getByLabelText('Thema')
    expect(select.querySelector('optgroup')).toHaveAttribute('label', 'Support')
    expect(screen.getByRole('option', { name: 'Fehler' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bitte wählen' })).toBeInTheDocument()
  })

  it('wires description and error into aria-describedby and aria-invalid', () => {
    render(
      <Select name="thema" label="Thema" description="Wählen Sie eins" error="Pflichtfeld">
        <option value="a">A</option>
      </Select>
    )
    const select = screen.getByLabelText('Thema')
    expect(select).toHaveAttribute('aria-describedby', 'thema-description thema-error')
    expect(select).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets rest props override the derived id and ARIA', () => {
    render(
      <Select
        name="thema"
        label="Thema"
        error="ours"
        {...{ id: 'conform-id', 'aria-describedby': 'conform-error' }}
      >
        <option value="a">A</option>
      </Select>
    )
    expect(screen.getByLabelText('Thema')).toHaveAttribute('id', 'conform-id')
  })

  it('merges className onto the control and fieldClassName onto the wrapper', () => {
    const { container } = render(
      <Select name="thema" label="Thema" className="w-full" fieldClassName="col-span-full">
        <option value="a">A</option>
      </Select>
    )
    expect(screen.getByLabelText('Thema')).toHaveClass('sankara-field-control', 'w-full')
    expect(container.querySelector('.sankara-field')).toHaveClass('col-span-full')
  })

  it('forwards the ref to the select element', () => {
    const ref = { current: null as HTMLSelectElement | null }
    render(
      <Select name="thema" label="Thema" ref={ref}>
        <option value="a">A</option>
      </Select>
    )
    expect(ref.current?.tagName).toBe('SELECT')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/components/Select.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Select`**

Create `src/components/Select.tsx`:

```tsx
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

/** Children, not an `items` array, and no `placeholder` prop: <option> and
    <optgroup> are the native API and handle grouping for free, and a
    placeholder is <option value="">. RadioGroup takes `items` because radios
    have no equivalent native container -- the asymmetry tracks the platform. */
export type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'id' | 'className'> &
  SharedFieldProps & {
    ref?: Ref<HTMLSelectElement>
  }

export function Select({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  children,
  ...props
}: SelectProps) {
  return (
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
    >
      {({ id: controlId, describedBy, invalid }) => (
        <select
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/components/Select.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Export and add the story**

In `src/index.ts`:

```ts
export { Select } from './components/Select.js'
export type { SelectProps } from './components/Select.js'
```

Create `src/components/Select.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select.js'

const meta: Meta<typeof Select> = { title: 'Forms/Select', component: Select }
export default meta

type Story = StoryObj<typeof Select>

export const Default: Story = {
  render: () => (
    <Select name="thema" label="Thema">
      <option value="">Bitte wählen</option>
      <optgroup label="Support">
        <option value="bug">Fehler melden</option>
        <option value="account">Konto</option>
      </optgroup>
      <optgroup label="Sonstiges">
        <option value="presse">Presse</option>
      </optgroup>
    </Select>
  ),
}

export const WithError: Story = {
  render: () => (
    <Select name="thema" label="Thema" error="Bitte wählen Sie ein Thema.">
      <option value="">Bitte wählen</option>
      <option value="bug">Fehler melden</option>
    </Select>
  ),
}
```

- [ ] **Step 6: Run the gate and commit**

Run: `yarn check`

```bash
git add src/components/Select.tsx src/components/Select.test.tsx src/components/Select.stories.tsx src/index.ts
git commit -m "Add Select"
```

---

### Task 8: README, the three-library story, and the changeset

**Files:**
- Modify: `README.md`
- Create: `src/components/Forms.stories.tsx`
- Create: `.changeset/form-primitives.md`

**Interfaces:**
- Consumes: all six components from Tasks 2–7.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the three-library story**

The react-hook-form/conform split is the design constraint, so it has to be
visible in the workbench. Neither library is a dependency — the story emulates
the exact prop shapes each one produces.

Create `src/components/Forms.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox.js'
import { Input } from './Input.js'
import { RadioGroup } from './RadioGroup.js'
import { Select } from './Select.js'
import { Textarea } from './Textarea.js'

const meta: Meta = { title: 'Forms/Whole form' }
export default meta

type Story = StoryObj

const items = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
]

export const NoLibrary: Story = {
  render: () => (
    <form className="sankara-field">
      <Input name="email" label="E-Mail" type="email" required />
      <Textarea name="message" label="Nachricht" required />
      <Select name="thema" label="Thema">
        <option value="">Bitte wählen</option>
        <option value="bug">Fehler melden</option>
      </Select>
      <RadioGroup name="kontakt" label="Kontaktart" items={items} />
      <Checkbox name="agb" label="AGB akzeptieren" required />
    </form>
  ),
}

/** What react-hook-form's register() spreads: name, onChange, onBlur, ref.
    The spread name overrides the explicit one, which is why `name` is still
    required on the component. */
export const ReactHookFormShape: Story = {
  render: () => {
    const register = (fieldName: string) => ({
      name: fieldName,
      onChange: () => {},
      onBlur: () => {},
    })
    return (
      <form className="sankara-field">
        <Input name="email" label="E-Mail" {...register('email')} error="Ungültige Adresse" />
        <Textarea name="message" label="Nachricht" {...register('message')} />
      </form>
    )
  },
}

/** What conform's getInputProps() spreads: its own id and aria-*, pointing at
    its own error element. Rest props win (D4), so those survive and the
    consumer does not pass `error`. */
export const ConformShape: Story = {
  render: () => {
    const conformProps = {
      id: 'contact-email',
      name: 'email',
      'aria-describedby': 'contact-email-error',
      'aria-invalid': true as const,
    }
    return (
      <form className="sankara-field">
        <Input name="email" label="E-Mail" {...conformProps} />
        <p id="contact-email-error" className="sankara-field-error">
          Ungültige Adresse
        </p>
      </form>
    )
  },
}
```

- [ ] **Step 2: Run the story file through the gate**

Run: `yarn typecheck && yarn vitest run`
Expected: PASS. Stories are typechecked but not executed as tests.

- [ ] **Step 3: Write the README Forms section**

Add to `README.md`, after the `RichText` section:

````markdown
## Forms

Six pieces: `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`.
All are server components — a page with a form ships no JavaScript from this
package.

```tsx
import { Input, Textarea, Checkbox } from '@sankara-ui/core'

<Input name="email" label="E-Mail" type="email" required />
<Textarea name="message" label="Nachricht" />
<Checkbox name="agb" label="AGB akzeptieren" />
```

**`name` is required and doubles as the id.** There is no `useId` — that is a
client-only hook, and using it would make every form page ship JavaScript. Pass
`id` explicitly when two forms on one page share a field name; otherwise their
ids collide.

**They work with any form library, or none.** Every prop the component does not
consume is forwarded to the native element, and **rest props override** the
derived `id`, `aria-describedby` and `aria-invalid`:

```tsx
<Input name="email" label="E-Mail" {...register('email')} />        // react-hook-form
<Input label="E-Mail" {...getInputProps(field, {type:'email'})} />  // conform
```

conform supplies its own id and ARIA pointing at its own error element; because
rest props win, those survive and you simply do not pass `error`. Passing both
conform's props *and* this package's `error` renders two error elements with
only conform's announced.

**`className` targets the control; `fieldClassName` targets the wrapper.** Both
merge:

```tsx
<Input name="email" label="E-Mail" className="w-full" fieldClassName="col-span-full" />
```

**These carry a surface, unlike the other components.** `Button`, `Dialog` and
`Popover` ship structure only and leave background, border and radius to you. The
form controls do not: Tailwind preflight zeroes `border-width` on every element,
so a control with no surface is invisible rather than merely unstyled. The
default uses `--color-surface`, `--color-muted` and `--radius-card`, and lives in
`@layer components` — so one utility per property overrides any of it:

```tsx
<Input name="email" label="E-Mail" className="border-0 bg-transparent rounded-none" />
```

**Errors are never signalled by colour alone.** `error` renders a message element
and sets `aria-invalid`; nothing recolours the control's border as the only cue.

For a control this package lacks, `Field` is exported and hands you the wiring:

```tsx
<Field name="colour" label="Farbe" error={e}>
  {({ id, describedBy, invalid }) => (
    <ThirdPartyPicker id={id} aria-describedby={describedBy} aria-invalid={invalid} />
  )}
</Field>
```
````

- [ ] **Step 4: Write the changeset**

Create `.changeset/form-primitives.md`:

```markdown
---
'@sankara-ui/core': minor
---

Add the form primitives: `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`
and `Select`.

All six are server components — the id derives from the required `name` prop
rather than `useId`, so a page with a form ships no JavaScript from this package.
Pass `id` explicitly when two forms on one page share a field name.

They are form-library agnostic by construction: every unconsumed prop is
forwarded to the native element, and rest props override the derived `id`,
`aria-describedby` and `aria-invalid`. react-hook-form's `register()`, conform's
`getInputProps()`, and plain native forms all work without an adapter.

Two new tokens: `--color-error` and `--field-accent`.

Unlike `Button`, `Dialog` and `Popover`, the form controls ship a visible surface
— Tailwind preflight zeroes `border-width`, so a control with no default is
invisible rather than merely unstyled. It is built from `--color-surface`,
`--color-muted` and `--radius-card` in `@layer components`, so any consumer
utility overrides it.
```

- [ ] **Step 5: Run the full gate**

Run: `yarn check`
Expected: PASS — typecheck, all tests (existing 203 plus roughly 46 new), build.

- [ ] **Step 6: Commit**

```bash
git add README.md src/components/Forms.stories.tsx .changeset/form-primitives.md
git commit -m "Document the form primitives and add the three-library story"
```

- [ ] **Step 7: Open the PR**

```bash
git push -u origin feat/form-primitives
gh pr create --base main \
  --title "Add the form primitives: Field, Input, Textarea, Checkbox, RadioGroup, Select" \
  --body "Implements docs/specs/2026-08-13-form-primitives-design.md."
```

CI also runs the packaging smoke test, which packs the tarball and installs it
into a clean project. A broken `exports` or `files` entry fails there rather than
in `yarn check`.

---

## Out of scope for this plan

The spec's **Follow-up** section — moving `Carousel`, `Disclosure` and `FaIcon`'s
inline Tailwind utilities into `tokens.css` semantic classes so their `className`
escape hatch works — ships separately. It touches three existing components with
their own tests and has no dependency on this work. Verify the failure against a
real compiled build before starting it: the mechanism is certain, but which side
Tailwind's canonical sort favours for a given property pair is not.
