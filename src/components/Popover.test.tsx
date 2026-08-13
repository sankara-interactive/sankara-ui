import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button.js'
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
    expect(panelOf(container).className).toContain('sankara-popover')
  })

  it('wires a Button trigger, whose props declare the popover attributes', () => {
    // Regression: this worked only through Button's rest-prop spread, with
    // popoverTarget absent from ButtonProps — so it was a type error to pass
    // directly, and one prop-filtering change away from silently not opening.
    const { container } = render(
      <Popover id="footnote-1" trigger={<Button>Open</Button>}>
        <p>content</p>
      </Popover>
    )
    expect(triggerOf()).toHaveAttribute('popovertarget', 'footnote-1')
    expect(triggerOf().className).toContain('sankara-popover-trigger')
    expect(panelOf(container)).toHaveAttribute('id', 'footnote-1')
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

  it('renders exactly two top-level elements, trigger first, with no wrapper', () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(container.children).toHaveLength(2)
    expect(container.children[0]).toBe(triggerOf())
    expect(container.children[1]).toBe(panelOf(container))
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

  it('preserves the caller’s onClick alongside the popover wiring', async () => {
    const onClick = vi.fn()
    render(
      <Popover
        id="p1"
        trigger={
          <button type="button" onClick={onClick}>
            Open
          </button>
        }
      >
        <p>content</p>
      </Popover>
    )
    await userEvent.click(triggerOf())
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('preserves the caller’s ref on the trigger', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Popover
        id="p1"
        trigger={
          <button type="button" ref={ref}>
            Open
          </button>
        }
      >
        <p>content</p>
      </Popover>
    )
    expect(ref.current).toBe(triggerOf())
  })
})

// `trigger`'s type — ReactElement<ComponentPropsWithoutRef<'button'>> — enforces
// nothing at the call site: any ReactElement structurally satisfies it, so an
// <a> typechecks and silently never opens. This dev-only console.error is the
// only signal a consumer gets.
describe('Popover trigger tag validation', () => {
  it('warns when the trigger element is not a button or input', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Popover id="p1" trigger={<a href="/leistungen">Open</a>}>
        <p>content</p>
      </Popover>
    )
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('<a>'))
    errorSpy.mockRestore()
  })

  it('stays silent for a <button> trigger', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <p>content</p>
      </Popover>
    )
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('stays silent for a button-like <input> trigger', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Popover id="p1" trigger={<input type="button" value="Open" />}>
        <p>content</p>
      </Popover>
    )
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
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

  // TypeScript does not check hyphenated JSX attributes, so a consumer can
  // pass data-placement through the rest-prop spread without a type error.
  // The component-owned data-placement must win, or no [data-placement]
  // selector in styles.css matches and the panel silently loses positioning.
  it('does not let a spread data-placement override the component-owned one', () => {
    const { container } = render(
      <Popover
        id="p1"
        placement="top-end"
        data-placement="evil"
        trigger={<button type="button">Open</button>}
      >
        <p>content</p>
      </Popover>
    )
    expect(panelOf(container)).toHaveAttribute('data-placement', 'top-end')
  })
})

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
    // A held modifier key only carries across calls within the same session:
    // the top-level userEvent.* functions each start a fresh session, so the
    // Meta keydown from a separate userEvent.keyboard() call would never reach
    // a later userEvent.click() call.
    const user = userEvent.setup()
    await user.keyboard('{Meta>}')
    await user.click(screen.getByRole('link'))
    await user.keyboard('{/Meta}')
    expect(hidePopover).not.toHaveBeenCalled()
  })

  it('stays open for a non-primary button click', () => {
    const { container } = render(
      <Popover id="p1" trigger={<button type="button">Open</button>}>
        <a href="/leistungen">Leistungen</a>
      </Popover>
    )
    const hidePopover = stubHidePopover(container)
    // userEvent.click always sends button 0 (primary); fireEvent lets us
    // dispatch a genuine non-primary (e.g. middle-click) click event.
    fireEvent.click(screen.getByRole('link'), { button: 1 })
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
