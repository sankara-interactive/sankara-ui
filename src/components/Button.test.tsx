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
