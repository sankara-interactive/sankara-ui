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
