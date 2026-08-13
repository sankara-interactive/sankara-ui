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
