# `Button` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Button` — a server component that owns button correctness and no
appearance — per `docs/specs/2026-08-03-button-design.md`.

**Architecture:** A `<button type="button">` by default. A `render` prop takes
any element (`next/link`, a Storyblok `SbLink`, a plain `<a>`), which the
component clones and merges its own props into, so neither `next` nor anything
Storyblok is imported. `disabled` maps to the native attribute on a real
`<button>` and errors in development anywhere else. The stylesheet carries six
structural declarations and a focus ring, inside `@layer components`.

**Tech Stack:** React 19, TypeScript (`module: nodenext`), Tailwind v4, Vitest +
jsdom + Testing Library, Storybook 10, Changesets.

## Global Constraints

- Relative imports carry the `.js` extension (`../utilities/cn.js`) — `nodenext`
  plus `verbatimModuleSyntax`.
- `Button` is a **server component**. No `'use client'`, no hooks, no handlers
  the component itself owns beyond composing the caller's.
- Component styles live in `src/styles/tokens.css`, prefixed `sankara-`, and
  **must sit inside `@layer components`** — `tokens.test.ts` fails otherwise.
- Token contract stays in sync across three places: `src/styles/tokens.ts`
  (`TOKENS`), `src/styles/tokens.css` (`@theme`), and the README table.
- No new dependency. No appearance: no `font-weight`, `padding`,
  `border-radius`, `background`, `color`, `box-shadow` or `transition`.
- Public surface is `src/index.ts`.
- `yarn check` (typecheck + test + build) must pass before any PR.
- Every user-facing change needs a changeset committed alongside it.
- Work on branch `feat/button`. Never commit to `main`. Ask before pushing.

## Findings already established (do not re-derive)

- **jsdom implements no Popover API**, which is irrelevant here, but the same
  jsdom limits apply to layout: no `:focus-visible` rendering, no outline
  painting. Those checks belong in Task 4, not in unit tests.
- **`cloneElement` merges props shallowly.** A `style` or `className` passed in
  the clone config *replaces* the caller's rather than merging. `Popover` was
  fixed for exactly this; see `src/components/Popover.tsx`.
- **`cloneElement` replaces a `ref`,** it does not compose. The spec therefore
  scopes `Button`'s own `ref` to the default branch only.
- **Unlayered package CSS beats consumer utilities.** Every rule added here goes
  inside `@layer components`; `tokens.test.ts` enforces it.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/Button.tsx` (create) | The component: default branch, render branch, merge contract, guards |
| `src/components/Button.test.tsx` (create) | The contract that breaks silently |
| `src/components/Button.stories.tsx` (create) | Default, submit, link, disabled, skinned |
| `src/styles/tokens.ts` (modify) | `--color-focus` in `TOKENS` |
| `src/styles/tokens.css` (modify) | `--color-focus` default, `.sankara-button` rules |
| `src/styles/button-css.test.ts` (create) | Pins the stylesheet contract |
| `src/index.ts` (modify) | Export `Button`, `ButtonProps` |
| `README.md` (modify) | Consumer documentation, token table row |
| `.changeset/*.md` (create) | Minor bump |

---

### Task 1: The component

**Files:**
- Create: `src/components/Button.tsx`
- Test: `src/components/Button.test.tsx`

**Interfaces:**
- Consumes: `cn` from `../utilities/cn.js`.
- Produces:
  - `export type ButtonProps`
  - `export function Button(props: ButtonProps): JSX.Element`
  - Rendered contract for Task 2's CSS: the rendered element always carries the
    class `sankara-button`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button.js'

afterEach(() => vi.restoreAllMocks())

describe('Button default branch', () => {
  it('renders a button that cannot submit a form by accident', () => {
    render(<Button>Speichern</Button>)
    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('respects an explicit type', () => {
    render(<Button type="submit">Absenden</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('carries the component class alongside the caller’s', () => {
    render(<Button className="btn btn-primary">Speichern</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('sankara-button')
    expect(button.className).toContain('btn btn-primary')
  })

  it('sets the native disabled attribute and no ARIA', () => {
    render(<Button disabled>Speichern</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-disabled')
  })

  it('passes the caller’s ref to the button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Speichern</Button>)
    expect(ref.current?.tagName).toBe('BUTTON')
  })
})

describe('Button render branch', () => {
  it('renders the caller’s element instead of a button', () => {
    render(<Button render={<a href="/kontakt" />}>Kontakt</Button>)
    const link = screen.getByRole('link', { name: 'Kontakt' })
    expect(link).toHaveAttribute('href', '/kontakt')
    expect(link.className).toContain('sankara-button')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('adds no type attribute to a non-button element', () => {
    render(<Button type="submit" render={<a href="/x" />}>Kontakt</Button>)
    expect(screen.getByRole('link')).not.toHaveAttribute('type')
  })

  it('merges className and style rather than replacing them', () => {
    render(
      <Button className="from-button" style={{ color: 'red' }}
              render={<a href="/x" className="from-render" style={{ margin: '4px' }} />}>
        Kontakt
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link.className).toContain('sankara-button')
    expect(link.className).toContain('from-render')
    expect(link.className).toContain('from-button')
    expect(link.style.color).toBe('red')
    expect(link.style.margin).toBe('4px')
  })

  it('runs both click handlers, the Button’s first', async () => {
    const order: string[] = []
    render(
      <Button onClick={() => order.push('button')}
              render={<a href="#x" onClick={() => order.push('render')} />}>
        Kontakt
      </Button>
    )
    await userEvent.click(screen.getByRole('link'))
    expect(order).toEqual(['button', 'render'])
  })

  it('lets the render element’s own props win', () => {
    render(<Button id="from-button" render={<a href="/x" id="from-render" />}>Kontakt</Button>)
    expect(screen.getByRole('link')).toHaveAttribute('id', 'from-render')
  })

  it('replaces the render element’s children with its own', () => {
    render(<Button render={<a href="/x">ignored</a>}>Kontakt</Button>)
    const link = screen.getByRole('link')
    expect(link.textContent).toBe('Kontakt')
  })
})

describe('Button render={<button/>}', () => {
  it('treats a literal button as a button', () => {
    render(<Button disabled render={<button className="mine" />}>Speichern</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toBeDisabled()
    expect(button.className).toContain('mine')
  })
})

describe('Button guards', () => {
  it('errors in development when disabled is passed with a link', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Button disabled render={<a href="/x" />}>Kontakt</Button>)
    const link = screen.getByRole('link')
    expect(error).toHaveBeenCalledOnce()
    expect(String(error.mock.calls[0]?.[0])).toMatch(/disabled/i)
    expect(link).not.toHaveAttribute('disabled')
    expect(link).not.toHaveAttribute('aria-disabled')
  })

  it('throws on a fragment render', () => {
    expect(() =>
      render(<Button render={<><a href="/a" /><a href="/b" /></>}>Kontakt</Button>)
    ).toThrow(/single element/i)
  })

  it('renders unstyled when a custom component swallows props', () => {
    // Pinned, not endorsed: cloneElement cannot make a component forward props.
    const Swallower = () => <a href="/x">Kontakt</a>
    render(<Button render={<Swallower />}>Kontakt</Button>)
    expect(screen.getByRole('link').className).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/components/Button.test.tsx`
Expected: FAIL — `Failed to resolve import "./Button.js"`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/Button.tsx
import {
  Fragment,
  cloneElement,
  isValidElement,
  type AriaAttributes,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '../utilities/cn.js'

// Deliberately not the whole <button> prop set: formAction, name, value and
// form are meaningless on an anchor, and href can never be passed here at all.
// Element-specific props belong on the element handed to `render`.
type SharedProps = Pick<
  ComponentPropsWithoutRef<'button'>,
  'id' | 'onClick' | 'onFocus' | 'onBlur' | 'title' | 'tabIndex' | 'style'
>

export type ButtonProps = SharedProps &
  AriaAttributes & {
    children: ReactNode
    /** Render as something else — next/link, an SbLink, a plain <a>. Cloned,
        not wrapped. Element-specific props go on this element. */
    render?: ReactElement
    /** Native attribute. A no-op with a non-button `render`, which errors in
        development. */
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    /** Applies to the default <button>. With `render`, put the ref on your own
        element — cloneElement replaces a ref rather than composing it. */
    ref?: Ref<HTMLButtonElement>
  } & { [key: `data-${string}`]: string | number | boolean | undefined }

type RenderProps = {
  className?: string
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLElement>) => void
  type?: 'button' | 'submit' | 'reset'
}

function describeElement(type: ReactElement['type']): string {
  if (typeof type === 'string') return `<${type}>`
  return (type as { displayName?: string; name?: string }).displayName ??
    (type as { name?: string }).name ??
    'a custom component'
}

export function Button({
  children,
  render,
  disabled,
  type,
  className,
  style,
  onClick,
  ref,
  ...props
}: ButtonProps) {
  if (render !== undefined && (!isValidElement(render) || render.type === Fragment)) {
    throw new Error(
      'Button: `render` must be a single element (an <a>, a Link, a <button>), not a fragment or a list.'
    )
  }

  if (!render) {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled}
        className={cn('sankara-button', className)}
        style={style}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    )
  }

  const renderProps = render.props as RenderProps
  // Reliable for an intrinsic element, impossible for a custom component: one
  // that renders a <button> is treated as a link. Documented in the spec's D4.
  const isNativeButton = render.type === 'button'

  if (process.env.NODE_ENV !== 'production' && disabled && !isNativeButton) {
    console.error(
      `Button: \`disabled\` does nothing on ${describeElement(render.type)}. A disabled link is not ` +
        'a thing in HTML — do not render the link instead of disabling it.'
    )
  }

  const composedClick =
    onClick || renderProps.onClick
      ? (event: MouseEvent<HTMLElement>) => {
          onClick?.(event as MouseEvent<HTMLButtonElement>)
          renderProps.onClick?.(event)
        }
      : undefined

  return cloneElement(render, {
    // Ours first, then the render element's own — it is their element, so their
    // props win any collision the merge table does not name explicitly.
    ...props,
    ...renderProps,
    className: cn('sankara-button', renderProps.className, className),
    // cloneElement merges props shallowly, so style must be merged by hand.
    style: { ...style, ...renderProps.style },
    onClick: composedClick,
    children,
    ...(isNativeButton
      ? { type: renderProps.type ?? type ?? 'button', disabled }
      : {}),
  } as Partial<RenderProps> & { children: ReactNode })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run src/components/Button.test.tsx`
Expected: PASS, 15 tests.

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`
Expected: no errors. If `cloneElement`'s props argument is rejected, widen the
existing cast — do **not** type `render` as `ReactElement<any>` and do not add
`@ts-expect-error`.

- [ ] **Step 6: Prove the tests by mutation**

For each of these, make the change, run
`yarn vitest run src/components/Button.test.tsx`, confirm the named test fails,
then restore:

1. `type={type ?? 'button'}` → `type={type}` — the accidental-submit test must fail.
2. `{ ...style, ...renderProps.style }` → `style` — the style merge test must fail.
3. Remove `renderProps.onClick?.(event)` — the handler-order test must fail.
4. `isNativeButton` → `false` — the literal-button test must fail.
5. Remove the `console.error` block — the guard test must fail.

Record each result in your report. A mutation that leaves the suite green means
the corresponding test does not test what it claims.

- [ ] **Step 7: Commit**

```bash
git add src/components/Button.tsx src/components/Button.test.tsx
git commit -m "feat: add Button, a server component that owns correctness not appearance"
```

---

### Task 2: Token and stylesheet

**Files:**
- Modify: `src/styles/tokens.ts`, `src/styles/tokens.css`, `README.md` (token table only)
- Test: `src/styles/button-css.test.ts` (create)

**Interfaces:**
- Consumes: the `sankara-button` class from Task 1.
- Produces: the `--color-focus` token, and the `.sankara-button` rules.

- [ ] **Step 1: Write the failing stylesheet test**

```ts
// src/styles/button-css.test.ts
// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const base = css.match(/\.sankara-button \{[^}]*\}/s)?.[0] ?? ''

describe('button stylesheet', () => {
  it('carries the structural declarations and nothing decorative', () => {
    expect(base).toContain('display: inline-flex')
    expect(base).toContain('align-items: center')
    expect(base).toContain('justify-content: center')
    expect(base).toContain('gap: 0.5rem')
    expect(base).toContain('cursor: pointer')
    // Links rendered as buttons are underlined by the UA without this.
    expect(base).toContain('text-decoration: none')
  })

  it('ships no appearance a consumer would have to override', () => {
    for (const property of [
      'background',
      'color:',
      'border-radius',
      'box-shadow',
      'font-weight',
      'padding',
      'transition',
    ]) {
      expect(base).not.toContain(property)
    }
  })

  it('draws a focus ring from the token, not from currentColor', () => {
    const focus = css.match(/\.sankara-button:focus-visible \{[^}]*\}/s)?.[0] ?? ''
    expect(focus).toContain('outline: 2px solid var(--color-focus)')
    expect(focus).toContain('outline-offset')
    // An outline sits outside the control, against the page — currentColor
    // would be invisible whenever the button's text matches the page.
    expect(focus).not.toContain('currentColor')
  })

  it('declares the focus token with a default', () => {
    expect(css).toMatch(/--color-focus:\s*var\(--color-primary\)/)
  })

  it('has no disabled rule — the native attribute needs no help', () => {
    expect(css).not.toContain('.sankara-button:disabled')
    expect(css).not.toContain('.sankara-button[aria-disabled')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/styles/button-css.test.ts`
Expected: FAIL — `tokens.css` has no button rules yet.

- [ ] **Step 3: Add the token**

In `src/styles/tokens.css`, inside the existing `@theme` block, after
`--color-backdrop`:

```css
  --color-focus: var(--color-primary);
```

In `src/styles/tokens.ts`, add `'--color-focus'` to the `TOKENS` array, keeping
the file's existing ordering convention.

- [ ] **Step 4: Add the rules**

Append to `src/styles/tokens.css`:

```css
/* Button structure. Everything here is layout or interaction; the skin —
   padding, radius, colour, weight, shadow, transition — differs in every
   project surveyed, and a package default would be something consumers fight
   rather than build on. Layered for the reason spelled out at .sankara-popover:
   an unlayered rule beats Tailwind's utilities outright. */
@layer components {
  .sankara-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    /* The component renders links; without this the UA underlines them. */
    text-decoration: none;
  }

  /* outline-offset draws the ring outside the control, so it sits against the
     page rather than the button — currentColor would vanish whenever the two
     match. The token defaults to --color-primary and is overridable. */
  .sankara-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 5: Add the README token row**

In the README's token table, after the `--color-backdrop` row:

```markdown
| `--color-focus` | Focus ring on `Button`, defaults to `--color-primary` |
```

- [ ] **Step 6: Run the tests**

Run: `yarn vitest run src/styles/`
Expected: PASS — the new file's 5 tests, plus `tokens.test.ts` still green,
including its layering invariant and its "every TOKENS entry has a CSS default"
check, which now covers `--color-focus`.

- [ ] **Step 7: Prove the layering and the token by mutation**

1. Move the `.sankara-button` block outside `@layer components` — the layering
   test in `tokens.test.ts` must fail, naming the selector. Restore.
2. Remove `--color-focus` from the `@theme` block — the token-contract test in
   `tokens.test.ts` must fail. Restore.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.ts src/styles/tokens.css src/styles/button-css.test.ts README.md
git commit -m "feat: add the Button stylesheet and the --color-focus token"
```

---

### Task 3: Public surface, stories, docs, changeset

**Files:**
- Modify: `src/index.ts`, `README.md`
- Create: `src/components/Button.stories.tsx`, `.changeset/button.md`

**Interfaces:**
- Consumes: `Button`, `ButtonProps` from Task 1; the `sankara-button` class and
  `--color-focus` from Task 2.
- Produces: the package's public `Button` export.

- [ ] **Step 1: Export the component**

In `src/index.ts`, after the `Carousel` line:

```ts
export { Button, type ButtonProps } from './components/Button.js'
```

- [ ] **Step 2: Write the stories**

The component ships no appearance, so every story supplies its own via the
design tokens — otherwise Storybook shows unstyled text and the story teaches
the wrong thing.

```tsx
// src/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button.js'

const meta: Meta<typeof Button> = { component: Button, title: 'Button' }
export default meta

const skin = 'rounded-card bg-primary px-5 py-2.5 font-medium text-primary-contrast'
const skinSecondary = 'rounded-card border border-muted px-5 py-2.5 font-medium text-on-surface'

export const Default: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex gap-4 p-8">
      <Button className={skin}>Termin vereinbaren</Button>
      <Button className={skinSecondary}>Mehr erfahren</Button>
    </div>
  ),
}

export const AsLink: StoryObj<typeof Button> = {
  // Storybook cannot import next/link; a plain <a> exercises the same path.
  render: () => (
    <div className="p-8">
      <Button className={skin} render={<a href="#kontakt" />}>Kontakt aufnehmen</Button>
    </div>
  ),
}

export const Submit: StoryObj<typeof Button> = {
  render: () => (
    <form className="flex items-end gap-4 p-8" onSubmit={event => event.preventDefault()}>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">E-Mail</span>
        <input className="rounded-card border border-muted px-3 py-2" type="email" />
      </label>
      <Button className={skin} type="submit">Absenden</Button>
      <Button className={skinSecondary}>Zurücksetzen (kein submit)</Button>
    </form>
  ),
}

export const Disabled: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex gap-4 p-8">
      <Button className={`${skin} disabled:opacity-45`} disabled>
        Nicht verfügbar
      </Button>
    </div>
  ),
}
```

- [ ] **Step 3: Write the README section**

Insert after the `Carousel` section in `README.md`:

````markdown
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
not on `Button`. Where both sides set the same thing, `className` and `style`
merge, both `onClick` handlers run with `Button`'s first, `Button`'s `children`
win, and everything else is yours. A fragment or a list throws. A custom
component has to forward unknown props to a real element — one that swallows
them renders unstyled, and nothing can detect that before it renders.

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
````

- [ ] **Step 4: Verify the whole gate**

Run: `yarn check`
Expected: typecheck clean, all tests pass, build emits
`dist/components/Button.js`. `check-directives.mjs` must still report `'use
client'` preserved in **3** source files — `Button` is a server component, so
this number does not change.

- [ ] **Step 5: Write the changeset**

```bash
cat > .changeset/button.md <<'EOF'
---
'@sankara-ui/core': minor
---

Add `Button` — a server component that owns button correctness and no
appearance.

`type="button"` by default so a button in a form cannot submit it by accident, a
`render` prop that turns it into a `next/link`, a Storyblok link helper or a
plain `<a>` without the package depending on either, native `disabled`, and a
focus ring driven by the new `--color-focus` token. No variants, sizes or
colours: the surveyed projects share the structure and none of the skin.
EOF
```

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/components/Button.stories.tsx README.md .changeset/button.md
git commit -m "feat: export Button with stories, docs and a changeset"
```

---

### Task 4: Browser verification

The focus ring is the one part of this component that cannot be verified in
jsdom, and it is also the part most likely to be wrong — the whole reason D5
replaced `currentColor` with a token was an invisibility failure that only shows
up on a rendered page.

**Files:**
- Modify: `docs/specs/2026-08-03-button-design.md` (add a `## Verification` section)

**Interfaces:**
- Consumes: the built Storybook from Task 3.
- Produces: a verification record, and either confirmation or a defect list.

- [ ] **Step 1: Build and serve Storybook**

```bash
yarn build-storybook -o /tmp/sb-button
cd /tmp/sb-button && python3 -m http.server 8902 &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8902/index.html
```

Story ids follow `button--default`, `button--as-link`, `button--submit`,
`button--disabled`. Load them at
`http://localhost:8902/iframe.html?id=<id>&viewMode=story`.

- [ ] **Step 2: Measure the focus ring**

Focus the button programmatically and read the computed outline. `:focus-visible`
does not match a programmatic `.focus()` in every engine, so use keyboard
navigation where possible and record which you used:

```js
const b = document.querySelector('.sankara-button')
b.focus()
const cs = getComputedStyle(b)
;({ outline: cs.outlineColor + ' ' + cs.outlineWidth, offset: cs.outlineOffset,
    matchesFocusVisible: b.matches(':focus-visible') })
```

Expected: a non-zero outline width in the `--color-primary` colour, offset 2px.

- [ ] **Step 3: Check the ring is visible against the page, not just the button**

This is the failure D5 exists to prevent. Compare the computed ring colour with
the page background behind it:

```js
const b = document.querySelector('.sankara-button')
;({ ring: getComputedStyle(b).outlineColor,
    pageBg: getComputedStyle(document.body).backgroundColor,
    buttonBg: getComputedStyle(b).backgroundColor })
```

Record all three. If the ring resolves to the same colour as the page
background, that is a defect — report it, do not adjust the story to hide it.

- [ ] **Step 4: Check forced-colors**

Emulate `forced-colors: active` in DevTools and confirm a focus indicator is
still visible. Record what you observe.

- [ ] **Step 5: Check the disabled button is genuinely inert**

In the `button--disabled` story, confirm the button is not focusable by
keyboard, does not fire a click, and is exposed as disabled:

```js
const b = document.querySelector('.sankara-button');
let clicked = false; b.addEventListener('click', () => (clicked = true));
b.click();
;({ disabled: b.disabled, clicked, tabIndex: b.tabIndex })
```

Expected: `disabled: true`, `clicked: false`.

- [ ] **Step 6: Check the link branch**

In `button--as-link`, confirm the element is an `<a>` with the class, that it is
not underlined (`text-decoration-line: none`), and that it activates on `Enter`.

- [ ] **Step 7: Record the results in the spec**

Add a `## Verification` section to `docs/specs/2026-08-03-button-design.md`,
before `## Risks and open questions`, matching the format used in
`docs/specs/2026-08-02-popover-design.md`. State the browser and version, and
state explicitly what remains unobserved: other engines, real screen readers,
and the AT announcement of the disabled state.

- [ ] **Step 8: Clean up and commit**

```bash
pkill -f "http.server 8902"; rm -rf /tmp/sb-button
git add docs/specs/2026-08-03-button-design.md
git commit -m "docs: record the Button browser verification"
```

---

## Note on the estate's `btn` classes

This component does not replace them. `className="btn btn-primary"` keeps
working exactly as it does today; `Button` adds the `type` default, the link
branch and the ring underneath. A project migrating a call site changes
`<button className="btn btn-primary">` to
`<Button className="btn btn-primary">` and nothing else.
