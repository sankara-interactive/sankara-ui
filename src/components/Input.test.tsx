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
    // own error element. D4: rest props win on aria-*; id is a named prop, not
    // a rest prop, so conform's id is adopted (and the label follows it) rather
    // than overridden -- the two amount to the same outcome here.
    // (No separate `id="derived"` here: TS's own duplicate-prop check (TS2783)
    // correctly flags that as dead code -- the spread below already wins at
    // the JSX call site before Input ever runs.)
    render(
      <Input
        name="email"
        label="E-Mail"
        error="ours"
        {...{ id: 'conform-id', 'aria-describedby': 'conform-error', 'aria-invalid': true }}
      />
    )
    const input = screen.getByLabelText('E-Mail')
    expect(input).toHaveAttribute('id', 'conform-id')
    expect(input).toHaveAttribute('aria-describedby', 'conform-error')
  })

  it('lets a spread aria-invalid override the one error would derive', () => {
    // error="ours" alone would derive aria-invalid="true" -- a spread
    // aria-invalid={false} must still win, proving the spread actually
    // overrides rather than merely coinciding with the derived value.
    render(<Input name="email" label="E-Mail" error="ours" {...{ 'aria-invalid': false }} />)
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('aria-invalid', 'false')
  })

  it('forwards a spread name, as react-hook-form register() supplies', () => {
    // No separate `name="placeholder"` here for the same reason as above.
    render(<Input label="E-Mail" {...{ name: 'email' }} />)
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

  it('rejects checkbox at the type level', () => {
    // @ts-expect-error checkbox has its own component
    render(<Input name="x" label="X" type="checkbox" />)
  })
})
