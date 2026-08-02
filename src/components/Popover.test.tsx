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
