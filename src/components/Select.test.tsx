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
