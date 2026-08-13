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
