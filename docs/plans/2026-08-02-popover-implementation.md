# `Popover` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Popover` — a trigger plus an anchored, light-dismissing panel —
per `docs/specs/2026-08-02-popover-design.md`.

**Architecture:** Native `popover="auto"` with the declarative `popovertarget`
invoker, so light dismiss, `Escape`, the top layer and one-open-at-a-time come
from the browser. Positioning is CSS anchor positioning behind an `@supports`
gate, degrading to a full-bleed bottom sheet. The component contributes the
four-way wiring (`popovertarget` / panel `id` / anchor pair), a placement
attribute, and one delegated click handler that closes the panel when a link
inside it navigates. No wrapper element, no roles, no markup in the panel.

**Tech Stack:** React 19, TypeScript (`module: nodenext`), Tailwind v4, Vitest +
jsdom + Testing Library, Storybook 10, Changesets.

## Global Constraints

- Relative imports carry the `.js` extension (`../utilities/cn.js`) — `nodenext`
  plus `verbatimModuleSyntax`.
- `'use client'` must be the first line of `Popover.tsx`;
  `scripts/check-directives.mjs` fails the build if `dist` loses it.
- Component styles that Tailwind utilities cannot express live in
  `src/styles/tokens.css`, prefixed `sankara-`, exactly as `.sankara-dialog` and
  `.sankara-disclosure` do.
- No new dependency. No new token unless the spec's Tokens section is amended.
- Public surface is `src/index.ts`; a component not exported there is invisible.
- `yarn check` (typecheck + test + build) must pass before any PR.
- Every user-facing change needs a changeset committed alongside it.
- Work on branch `feat/popover`. Never commit to `main`. Ask before pushing.

## Findings already established (do not re-derive)

- **jsdom 25 has no Popover API.** `showPopover`, `hidePopover` and
  `togglePopover` are all `undefined`, and `element.matches(':popover-open')`
  throws `SyntaxError`. React does render the `popover` and `popovertarget`
  attributes correctly. Consequences: the component calls `hidePopover?.()`
  optionally, and tests assign a stub before asserting.
- **The anchor pair works through a CSS custom property.** Measured in Chrome
  150: with `--sankara-anchor: --p1` set inline on both elements and
  `anchor-name: var(--sankara-anchor)` / `position-anchor: var(--sankara-anchor)`
  in the stylesheet, all three bottom placements anchor correctly
  (`bottom-start` left edges align at 300; `bottom` centres match at 326.5;
  `bottom-end` right edges align at 338). This is why no anchor CSS is inlined
  and csstype support for `anchorName` is irrelevant.
- **The implicit anchor is not usable.** `position-anchor`'s initial value is
  `none` in Chrome 150; a popover with no explicit pair renders at 0,0. The
  explicit pair is required — see spec D3.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/Popover.tsx` (create) | The component: id defaulting, trigger cloning, panel, link-dismiss handler |
| `src/components/Popover.test.tsx` (create) | Wiring, cloning, placement, prop routing, dismissal contract |
| `src/components/Popover.stories.tsx` (create) | Nav dropdown, filter panel, six placements |
| `src/styles/tokens.css` (modify) | `.sankara-popover*` rules: fallback sheet, `@supports` anchored branch, placements, animation, `@custom-variant` |
| `src/styles/popover-css.test.ts` (create) | Asserts the stylesheet contract the components depend on |
| `src/index.ts` (modify) | Export `Popover`, `PopoverProps`, `PopoverPlacement` |
| `README.md` (modify) | Consumer documentation |
| `.changeset/*.md` (create) | Minor bump |

---

### Task 1: Spike the Tailwind `@custom-variant` export

Spec D7 ships a variant from `tokens.css` so consumers write
`popover-open:rotate-180`. Two things are unverified: that a `@custom-variant`
declared in an *imported package* stylesheet reaches the consumer's build, and
that the selector matches a chevron **nested inside** the trigger. Settle both
against compiled CSS before writing the component.

**Files:**
- Create: `/tmp/variant-spike/` (throwaway, outside the repo)
- Modify: none

**Interfaces:**
- Consumes: nothing.
- Produces: a yes/no that Task 4 depends on. If no, Task 4 ships the raw
  `:has()` selector documented in the README instead of the variant.

- [ ] **Step 1: Build a minimal Tailwind v4 project that imports the package stylesheet**

```bash
mkdir -p /tmp/variant-spike && cd /tmp/variant-spike
npm init -y >/dev/null
npm install tailwindcss @tailwindcss/cli >/dev/null
mkdir -p pkg
cp ~/Projects/sahli-interactive/sankara-ui/src/styles/tokens.css pkg/tokens.css
cat >> pkg/tokens.css <<'CSS'
@custom-variant popover-open (&:is(
  .sankara-popover-trigger:has(+ [popover]:popover-open),
  .sankara-popover-trigger:has(+ [popover]:popover-open) *
));
CSS
cat > input.css <<'CSS'
@import "tailwindcss";
@import "./pkg/tokens.css";
@source "./index.html";
CSS
cat > index.html <<'HTML'
<button class="sankara-popover-trigger" popovertarget="p">
  Label <span class="popover-open:rotate-180">v</span>
</button>
<div id="p" popover="auto" class="popover-open:opacity-100">panel</div>
HTML
```

- [ ] **Step 2: Compile and inspect the output**

Run: `npx @tailwindcss/cli -i input.css -o out.css && grep -n "popover-open\|:has" out.css`

Expected: a rule whose selector contains
`.sankara-popover-trigger:has(+ [popover]:popover-open) *` and applies
`rotate`. If `grep` finds nothing, the variant did not survive the package
import.

- [ ] **Step 3: Record the result in the spec**

Append the outcome to the D7 block of
`docs/specs/2026-08-02-popover-design.md`, replacing "**Spike before relying on
this**" with what was observed — either confirmation, or the decision to
document the raw selector instead. State the Tailwind version tested.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/sahli-interactive/sankara-ui
git add docs/specs/2026-08-02-popover-design.md
git commit -m "docs: record the @custom-variant spike result in the Popover spec"
```

- [ ] **Step 5: Clean up**

Run: `rm -rf /tmp/variant-spike`

---

### Task 2: The component — wiring, id, trigger cloning, panel

**Files:**
- Create: `src/components/Popover.tsx`
- Test: `src/components/Popover.test.tsx`

**Interfaces:**
- Consumes: `cn` from `../utilities/cn.js`.
- Produces:
  - `export type PopoverPlacement = 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end'`
  - `export type PopoverProps`
  - `export function Popover(props: PopoverProps): JSX.Element`
  - Rendered contract, relied on by Task 4's CSS: trigger carries class
    `sankara-popover-trigger`, `popovertarget={id}` and inline
    `--sankara-anchor: --{id}`; panel carries `id`, `popover="auto"`, class
    `sankara-popover`, `data-placement`, and the same custom property.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/Popover.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Popover } from './Popover.js'

const panelOf = (container: HTMLElement) => container.querySelector('[popover]') as HTMLElement
const triggerOf = () => screen.getByRole('button')

describe('Popover wiring', () => {
  it('points the trigger at the panel', () => {
    const { container } = render(
      <Popover id="nav-services" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf()).toHaveAttribute('popovertarget', 'nav-services')
    expect(panelOf(container)).toHaveAttribute('id', 'nav-services')
    expect(panelOf(container)).toHaveAttribute('popover', 'auto')
  })

  it('sets the same anchor custom property on both elements', () => {
    const { container } = render(
      <Popover id="nav-services" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf().style.getPropertyValue('--sankara-anchor')).toBe('--nav-services')
    expect(panelOf(container).style.getPropertyValue('--sankara-anchor')).toBe('--nav-services')
  })

  it('generates a CSS-identifier-safe id when none is given', () => {
    const { container } = render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    const id = panelOf(container).id
    expect(id).toMatch(/^[a-zA-Z_-][a-zA-Z0-9_-]*$/)
    expect(triggerOf()).toHaveAttribute('popovertarget', id)
  })

  it('renders the panel as the trigger’s next sibling', () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf().nextElementSibling).toBe(panelOf(container))
  })

  it('defaults placement to bottom-start and passes it through', () => {
    const { container, rerender } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(panelOf(container)).toHaveAttribute('data-placement', 'bottom-start')
    rerender(
      <Popover id="p1" placement="top-end" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(panelOf(container)).toHaveAttribute('data-placement', 'top-end')
  })
})

describe('Popover trigger cloning', () => {
  it('keeps the caller’s className and adds its own', () => {
    render(
      <Popover id="p1" trigger={<button type="button" className="btn btn-primary">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf().className).toContain('btn btn-primary')
    expect(triggerOf().className).toContain('sankara-popover-trigger')
  })

  it('merges the caller’s style rather than replacing it', () => {
    render(
      <Popover id="p1" trigger={<button type="button" style={{ color: 'red' }}>Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf().style.color).toBe('red')
    expect(triggerOf().style.getPropertyValue('--sankara-anchor')).toBe('--p1')
  })

  it('rejects a fragment trigger', () => {
    expect(() =>
      render(
        <Popover id="p1" trigger={<><button type="button">a</button><button type="button">b</button></>}>
          <p>content</p>
        </Popover>
      )
    ).toThrow(/single element/i)
  })
})

describe('Popover panel props', () => {
  it('routes className and rest props to the panel, not the trigger', () => {
    const { container } = render(
      <Popover id="p1" className="w-72" aria-label="Services" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(panelOf(container).className).toContain('w-72')
    expect(panelOf(container)).toHaveAttribute('aria-label', 'Services')
    expect(triggerOf().className).not.toContain('w-72')
  })

  it('lets the component’s anchor property win over a caller style', () => {
    const { container } = render(
      <Popover id="p1" style={{ ['--sankara-anchor' as string]: '--wrong' }} trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(panelOf(container).style.getPropertyValue('--sankara-anchor')).toBe('--p1')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/components/Popover.test.tsx`
Expected: FAIL — `Failed to resolve import "./Popover.js"`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/Popover.tsx
'use client'

import {
  Fragment,
  cloneElement,
  isValidElement,
  useId,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '../utilities/cn.js'

export type PopoverPlacement =
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'top-start'
  | 'top'
  | 'top-end'

export type PopoverProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'id' | 'children' | 'popover'
> & {
  /** Defaults to a sanitised useId(). If given: document-unique, and a valid
      CSS identifier — it becomes an anchor-name. */
  id?: string
  /** A <button type="button"> or button-like <input>. Cloned, not wrapped. */
  trigger: ReactElement<ComponentPropsWithoutRef<'button'>>
  /** Mapped to position-area in styles.css. */
  placement?: PopoverPlacement
  children: ReactNode
}

// React's useId contains characters that are invalid in a CSS identifier
// (guillemets in 19, colons in 18) and the value doubles as an anchor-name.
function toCssIdent(value: string): string {
  return `sp${value.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function Popover({
  id,
  trigger,
  placement = 'bottom-start',
  className,
  children,
  style,
  ...props
}: PopoverProps) {
  const generatedId = useId()
  const panelId = id ?? toCssIdent(generatedId)

  if (!isValidElement(trigger) || trigger.type === Fragment) {
    throw new Error(
      'Popover: `trigger` must be a single element (a <button>), not a fragment or a list.'
    )
  }

  const triggerProps = trigger.props
  // The anchor names travel as one custom property; every anchor declaration
  // itself lives in styles.css, keyed off .sankara-popover-trigger and
  // .sankara-popover. Verified in Chrome 150 — see the spec's D3.
  const anchor = { ['--sankara-anchor' as string]: `--${panelId}` } as CSSProperties

  const wiredTrigger = cloneElement(trigger, {
    popoverTarget: panelId,
    className: cn(triggerProps.className, 'sankara-popover-trigger'),
    // cloneElement merges props shallowly, so style must be merged by hand or
    // the caller's own style object is replaced outright.
    style: { ...triggerProps.style, ...anchor },
  })

  return (
    <>
      {wiredTrigger}
      <div
        id={panelId}
        popover="auto"
        data-placement={placement}
        className={cn('sankara-popover', className)}
        style={{ ...style, ...anchor }}
        {...props}
      >
        {children}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run src/components/Popover.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`
Expected: no errors. If `cloneElement` rejects the props object, widen the cast
to `as Partial<ComponentPropsWithoutRef<'button'>>` — do **not** loosen the
`trigger` prop type to `ReactElement<any>`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Popover.tsx src/components/Popover.test.tsx
git commit -m "feat: add Popover on the native Popover API"
```

---

### Task 3: Link dismissal

Spec D6. Four of five surveyed usages are lists of links, and `popover="auto"`
does not light-dismiss on a click *inside* the panel.

**Files:**
- Modify: `src/components/Popover.tsx`
- Test: `src/components/Popover.test.tsx`

**Interfaces:**
- Consumes: the panel element rendered in Task 2.
- Produces: no new export. Behavioural contract: the panel closes only on an
  unmodified primary click that resolves to an `<a href>` with no `download`
  and no `target` other than `_self`, whose default was not prevented, and a
  caller `onClick` runs first.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Popover.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// jsdom 25 implements no part of the Popover API, so the method the component
// calls has to exist before it can be asserted on.
function stubHidePopover(container: HTMLElement) {
  const panel = container.querySelector('[popover]') as HTMLElement
  const hidePopover = vi.fn()
  Object.assign(panel, { hidePopover })
  return hidePopover
}

describe('Popover link dismissal', () => {
  it('closes when a link inside the panel is clicked', async () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <a href="/leistungen">Leistungen</a>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    await userEvent.click(screen.getByRole('link'))
    expect(hidePopover).toHaveBeenCalledOnce()
  })

  it('closes when an element nested inside a link is clicked', async () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <a href="/leistungen"><span>Leistungen</span></a>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    await userEvent.click(screen.getByText('Leistungen'))
    expect(hidePopover).toHaveBeenCalledOnce()
  })

  it('stays open for a click that is not a link', async () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <button type="button">Filter</button>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(hidePopover).not.toHaveBeenCalled()
  })

  it('stays open for a modified click', async () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <a href="/leistungen">Leistungen</a>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    await userEvent.keyboard('{Meta>}')
    await userEvent.click(screen.getByRole('link'))
    await userEvent.keyboard('{/Meta}')
    expect(hidePopover).not.toHaveBeenCalled()
  })

  it('stays open for target="_blank" and for download links', async () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <a href="/a" target="_blank" rel="noreferrer">extern</a>
        <a href="/b.pdf" download>pdf</a>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    await userEvent.click(screen.getByRole('link', { name: 'extern' }))
    await userEvent.click(screen.getByRole('link', { name: 'pdf' }))
    expect(hidePopover).not.toHaveBeenCalled()
  })

  it('runs a caller onClick first and honours preventDefault', async () => {
    const order: string[] = []
    const { container } = render(
      <Popover
        id="p1"
        trigger={<button type="button">Open</button>}
        onClick={event => {
          order.push('caller')
          event.preventDefault()
        }}
      >
        <a href="/leistungen">Leistungen</a>
      </Popover>
    )
    const hidePopover = vi.fn(() => order.push('close'))
    Object.assign(container.querySelector('[popover]') as HTMLElement, { hidePopover })
    await userEvent.click(screen.getByRole('link'))
    expect(order).toEqual(['caller'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/components/Popover.test.tsx -t "link dismissal"`
Expected: FAIL — `hidePopover` never called, because no handler exists yet.

- [ ] **Step 3: Implement the handler**

In `src/components/Popover.tsx`, add `MouseEvent` to the type imports, pull
`onClick` out of the props spread, and add above the return:

```tsx
  // popover="auto" light-dismisses on clicks *outside* the panel. A link inside
  // it navigates, and with App Router the header layout survives, so the panel
  // would stay open over the new page. Optional call: jsdom and pre-popover
  // browsers have no hidePopover.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    const link = (event.target as HTMLElement).closest?.('a[href]')
    if (!link || link.hasAttribute('download')) return
    const target = link.getAttribute('target')
    if (target && target !== '_self') return
    event.currentTarget.hidePopover?.()
  }
```

and pass `onClick={handleClick}` to the panel, before the `{...props}` spread.

- [ ] **Step 4: Run the whole file**

Run: `yarn vitest run src/components/Popover.test.tsx`
Expected: PASS, 16 tests — the 10 from Task 2 plus these 6.

- [ ] **Step 5: Commit**

```bash
git add src/components/Popover.tsx src/components/Popover.test.tsx
git commit -m "feat: close the Popover panel when a link inside it navigates"
```

---

### Task 4: Stylesheet — fallback sheet, anchored branch, placements, animation

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `src/styles/popover-css.test.ts` (create)

**Interfaces:**
- Consumes: the class and attribute contract from Task 2 —
  `.sankara-popover-trigger`, `.sankara-popover`, `--sankara-anchor`,
  `[data-placement]`.
- Produces: the `popover-open` variant used by consumers and documented in
  Task 5's README section.

- [ ] **Step 1: Write the failing stylesheet test**

```ts
// src/styles/popover-css.test.ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const PLACEMENTS = [
  ['bottom-start', 'block-end span-inline-end'],
  ['bottom', 'block-end span-all'],
  ['bottom-end', 'block-end span-inline-start'],
  ['top-start', 'block-start span-inline-end'],
  ['top', 'block-start span-all'],
  ['top-end', 'block-start span-inline-start'],
] as const

describe('popover stylesheet', () => {
  it.each(PLACEMENTS)('maps %s to %s', (placement, area) => {
    const rule = css.match(
      new RegExp(`\\[data-placement=(['"])${placement}\\1\\][^}]*}`, 's')
    )
    expect(rule?.[0]).toContain(`position-area: ${area}`)
  })

  it('centres the centred placements with anchor-center', () => {
    for (const placement of ['bottom', 'top'] as const) {
      const rule = css.match(
        new RegExp(`\\[data-placement=(['"])${placement}\\1\\][^}]*}`, 's')
      )
      expect(rule?.[0]).toContain('justify-self: anchor-center')
    }
  })

  it('gates the anchored branch on both anchor properties', () => {
    const supports = css.match(/@supports \([^)]*position-anchor[^{]*{/)?.[0]
    expect(supports).toBeTruthy()
    expect(supports).toContain('position-area')
  })

  it('overrides the UA popover centring in the fallback', () => {
    const base = css.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(base).toContain('inset: auto 0 0 0')
    expect(base).toContain('margin: 0')
    expect(base).toMatch(/max-block-size: \d+svh/)
    expect(base).toContain('overflow: auto')
  })

  it('transitions display and overlay discretely, from the base rule', () => {
    const base = css.match(/\.sankara-popover \{[^}]*}/s)?.[0]
    expect(base).toContain('display var(--duration-expand) allow-discrete')
    expect(base).toContain('overlay var(--duration-expand) allow-discrete')
  })

  it('ships the popover-open variant', () => {
    expect(css).toContain('@custom-variant popover-open')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/styles/popover-css.test.ts`
Expected: FAIL on every case — `tokens.css` has no popover rules yet.

- [ ] **Step 3: Append the stylesheet**

Add to the end of `src/styles/tokens.css`:

```css
/* Native popover panel. The UA stylesheet gives [popover] inset: 0 and
   margin: auto, i.e. viewport-centred, so the base rules here are both the
   reset and the no-anchor-support fallback: a full-bleed bottom sheet. The
   @supports branch below turns that into an anchored panel. */
.sankara-popover {
  position: fixed;
  inset: auto 0 0 0;
  margin: 0;
  width: auto;
  max-block-size: 60svh;
  overflow: auto;
  padding-block-end: env(safe-area-inset-bottom);
  background: var(--color-surface);
  color: var(--color-on-surface);
  border: 0;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-raised);
  opacity: 0;
  translate: 0 0.25rem;
  /* On the base rule, not on :popover-open — a transition declared only in the
     open state stops applying the instant the popover closes, and the exit
     never animates. overlay must be in the list or the panel leaves the top
     layer immediately and the exit plays in the wrong stacking context. */
  transition:
    opacity var(--duration-expand) ease,
    translate var(--duration-expand) ease,
    display var(--duration-expand) allow-discrete,
    overlay var(--duration-expand) allow-discrete;
}

.sankara-popover:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  .sankara-popover:popover-open {
    opacity: 0;
    translate: 0 0.25rem;
  }
}

@supports (position-anchor: --a) and (position-area: block-end) {
  .sankara-popover-trigger {
    anchor-name: var(--sankara-anchor);
  }

  .sankara-popover {
    position-anchor: var(--sankara-anchor);
    inset: auto;
    max-block-size: none;
    width: max-content;
    /* Not part of the @supports condition: where try-fallbacks are missing the
       panel simply does not flip near a viewport edge. */
    position-try-fallbacks: flip-block, flip-inline;
  }

  .sankara-popover[data-placement='bottom-start'] {
    position-area: block-end span-inline-end;
  }
  .sankara-popover[data-placement='bottom'] {
    position-area: block-end span-all;
    justify-self: anchor-center;
  }
  .sankara-popover[data-placement='bottom-end'] {
    position-area: block-end span-inline-start;
  }
  .sankara-popover[data-placement='top-start'] {
    position-area: block-start span-inline-end;
  }
  .sankara-popover[data-placement='top'] {
    position-area: block-start span-all;
    justify-self: anchor-center;
  }
  .sankara-popover[data-placement='top-end'] {
    position-area: block-start span-inline-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sankara-popover {
    transition: none;
  }
}

/* The platform gives the invoker no open-state hook. The panel is the trigger's
   next sibling, so :has() reaches it — and the variant must match the trigger
   *or any descendant*, because the chevron people put the class on is a child
   of the button and its own next sibling is not the panel. */
@custom-variant popover-open (&:is(
  .sankara-popover-trigger:has(+ [popover]:popover-open),
  .sankara-popover-trigger:has(+ [popover]:popover-open) *
));
```

If Task 1's spike came out negative, drop the `@custom-variant` block, delete
the corresponding test case, and document the raw selector in Task 5 instead.

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/styles/popover-css.test.ts`
Expected: PASS, 11 tests — six placement cases from `it.each` plus five
contract tests.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/popover-css.test.ts
git commit -m "feat: add the Popover stylesheet with an anchored branch and sheet fallback"
```

---

### Task 5: Public surface, stories, docs, changeset

**Files:**
- Modify: `src/index.ts`, `README.md`
- Create: `src/components/Popover.stories.tsx`, `.changeset/popover.md`

**Interfaces:**
- Consumes: `Popover`, `PopoverProps`, `PopoverPlacement` from Task 2.
- Produces: the package's public `Popover` export.

- [ ] **Step 1: Export the component**

In `src/index.ts`, after the `Disclosure` line:

```ts
export { Popover, type PopoverProps, type PopoverPlacement } from './components/Popover.js'
```

- [ ] **Step 2: Write the stories**

```tsx
// src/components/Popover.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Popover } from './Popover.js'

const meta: Meta<typeof Popover> = { component: Popover, title: 'Popover' }
export default meta

export const NavDropdown: StoryObj<typeof Popover> = {
  render: () => (
    <nav className="p-8">
      <ul className="flex gap-6">
        <li>
          <Popover
            id="nav-leistungen"
            className="w-72 p-2"
            trigger={
              <button type="button" className="flex items-center gap-2 font-medium">
                Leistungen
                <span className="popover-open:rotate-180 transition-transform">v</span>
              </button>
            }
          >
            <ul>
              <li><a className="block px-3 py-2" href="#beratung">Beratung</a></li>
              <li><a className="block px-3 py-2" href="#umsetzung">Umsetzung</a></li>
            </ul>
          </Popover>
        </li>
        <li>
          <Popover
            id="nav-ueber-uns"
            className="w-72 p-2"
            trigger={<button type="button" className="font-medium">Über uns</button>}
          >
            <ul>
              <li><a className="block px-3 py-2" href="#team">Team</a></li>
            </ul>
          </Popover>
        </li>
      </ul>
    </nav>
  ),
}

export const FilterPanel: StoryObj<typeof Popover> = {
  render: () => (
    <div className="p-8">
      <Popover
        id="filter-thema"
        placement="bottom"
        className="w-96 p-6"
        trigger={<button type="button" className="rounded-full border px-4 py-2">Thema</button>}
      >
        <div className="flex flex-wrap gap-2">
          {['Gesundheit', 'Bildung', 'Wasser'].map(tag => (
            <button key={tag} type="button" className="rounded-full border px-3 py-1 text-sm">
              {tag}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  ),
}

export const Placements: StoryObj<typeof Popover> = {
  render: () => (
    <div className="grid min-h-[60vh] place-items-center gap-6 p-24">
      <div className="flex gap-4">
        {(['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end'] as const).map(
          placement => (
            <Popover
              key={placement}
              id={`placement-${placement}`}
              placement={placement}
              className="w-48 p-4"
              trigger={<button type="button" className="rounded border px-3 py-2">{placement}</button>}
            >
              <p>{placement}</p>
            </Popover>
          )
        )}
      </div>
    </div>
  ),
}
```

- [ ] **Step 3: Write the README section**

Insert after the `Disclosure` section in `README.md`:

````markdown
## Popover

Native `popover="auto"` with the declarative invoker, so light dismiss, `Escape`,
the top layer and one-open-at-a-time across a nav bar come from the browser.

```tsx
import { Popover } from '@sankara-ui/core'

<li>
  <Popover
    id={`nav-${item.id}`}
    className="w-72 p-2"
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
adds no `role` — a dropdown of links is a list of links, and `role="menu"` would
make screen readers announce a command menu and swap `Tab` for the arrow keys.

`id` is optional and defaults to a generated one. Supply it when you need stable
markup; it must then be document-unique **and** a valid CSS identifier, because
it becomes the anchor name.

`placement` takes `bottom-start` (default), `bottom`, `bottom-end`, `top-start`,
`top` and `top-end`. They are logical, so they flip under RTL.

`popover-open:` is a variant this package ships. Use it on the trigger or
anything inside it — a chevron, a label — to express the open state without
JavaScript.

The trigger must be a `<button type="button">` (or a button-like `<input>`):
`popovertarget` does nothing on an `<a>`, and an untyped `<button>` inside a
`<form>` submits it. A custom component as trigger has to forward unknown props
to a real button.

Clicking a link inside the panel closes it — otherwise the panel survives a
client-side navigation and hangs over the new page. Modified clicks,
`target="_blank"`, `download` links and anything that calls `preventDefault()`
leave it open.

Two limits worth knowing. The panel is in the top layer, so it always paints
above ordinary page content whatever your header's `z-index` — and no `z-index`
can raise it above a `<dialog>` or a popover opened after it. And on browsers
without CSS anchor positioning (notably Safari 18.0–18.3) the panel is a
full-bleed sheet at the bottom of the viewport instead of an anchored dropdown:
deliberately a different layout, never a misplaced one.
````

- [ ] **Step 4: Verify the whole gate**

Run: `yarn check`
Expected: typecheck clean, all tests pass, build emits `dist/components/Popover.js`
with `'use client'` intact — `check-directives.mjs` reports 3 files.

- [ ] **Step 5: Write the changeset**

```bash
cat > .changeset/popover.md <<'EOF'
---
'@sankara-ui/core': minor
---

Add `Popover` — a trigger plus an anchored panel on the native Popover API.

Light dismiss, `Escape`, the top layer and one-open-at-a-time come from
`popover="auto"`; positioning is CSS anchor positioning, degrading to a
full-bleed bottom sheet where it is unsupported. The component adds no wrapper
element and no ARIA roles, and ships a `popover-open:` Tailwind variant for
expressing the open state on the trigger.
EOF
```

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/components/Popover.stories.tsx README.md .changeset/popover.md
git commit -m "feat: export Popover with stories, docs and a changeset"
```

---

### Task 6: Browser verification

jsdom can see none of what makes this component work. Everything below is
observation, and its results belong in the spec, in the shape the `Disclosure`
matrix already established.

**Files:**
- Modify: `docs/specs/2026-08-02-popover-design.md` (add a `## Verification` section)

**Interfaces:**
- Consumes: the built Storybook from Task 5.
- Produces: a verification table, and either confirmation or a defect list.

- [ ] **Step 1: Start Storybook**

Run: `yarn storybook`
Open `http://localhost:6006/?path=/story/popover--nav-dropdown`.

- [ ] **Step 2: Check the anchored path in Chrome**

For each of the six placements in the `Placements` story, open the panel and
confirm it is anchored to its trigger, then measure rather than eyeball:

```js
const t = document.querySelector('[popovertarget="placement-bottom-start"]').getBoundingClientRect()
const p = document.getElementById('placement-bottom-start').getBoundingClientRect()
;({ triggerLeft: t.left, panelLeft: p.left, panelTop: p.top, triggerBottom: t.bottom })
```

Expected: `panelLeft === triggerLeft` for `*-start`, right edges equal for
`*-end`, centres equal for `bottom`/`top`, and `panelTop >= triggerBottom` for
the `bottom-*` row.

- [ ] **Step 3: Check the open-state variant on a nested chevron**

In the `NavDropdown` story, open a dropdown and confirm the chevron rotates.
This is what Task 1's spike predicts; a rotation here is the end-to-end proof.

- [ ] **Step 4: Check the fallback**

In DevTools, disable the `@supports` block's rules on `.sankara-popover` and
reload. Expected: the panel becomes a full-width sheet pinned to the bottom of
the viewport, scrollable, with no part of it off-screen — at 320px width, with
long content, and with `dir="rtl"` set on `<html>`.

- [ ] **Step 5: Check dismissal and focus**

Confirm: `Escape` closes and returns focus to the trigger; a click outside
closes; opening a second dropdown closes the first; a click on a link inside
closes the panel; `Cmd`-clicking that link does not.

- [ ] **Step 6: Check the animation**

The automated tab reports `visibilityState: "hidden"`, which freezes CSS
transitions at `currentTime: 0`. Force the settled state before measuring:

```js
document.getElementById('nav-leistungen').getAnimations().forEach(a => a.finish())
```

Confirm entry and exit both animate, and that with `prefers-reduced-motion:
reduce` emulated in DevTools they do not.

- [ ] **Step 7: Record the results in the spec**

Add a `## Verification` section to
`docs/specs/2026-08-02-popover-design.md` with a table of check against engine
and version, matching the `Disclosure` spec's format. State explicitly what
remains unobserved: real Safari 18.0–18.3, Firefox, real screen readers, and
the App Router navigation case from D6.

- [ ] **Step 8: Commit**

```bash
git add docs/specs/2026-08-02-popover-design.md
git commit -m "docs: record the Popover browser verification"
```

---

## Open item for the consuming session

Spec D6 assumes a panel survives an App Router client-side navigation. That can
only be observed in a real consumer. It does not block this work — `hidePopover`
on an already-closed popover is a no-op, so the handler is harmless if the
assumption is wrong — but if the template shows the panel closing on its own,
D6 loses its justification and `Popover` should become a server component.
