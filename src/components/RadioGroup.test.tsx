import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RadioGroup } from './RadioGroup.js'

const ITEMS = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'post', label: 'Post', disabled: true },
]

describe('RadioGroup', () => {
  it('names the group with a fieldset and legend', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    const group = screen.getByRole('group', { name: 'Kontaktart' })
    expect(group.tagName).toBe('FIELDSET')
    expect(within(group).getByText('Kontaktart').tagName).toBe('LEGEND')
  })

  it('renders one labelled radio per item, sharing the group name', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    for (const item of ITEMS) {
      const radio = screen.getByLabelText(item.label)
      expect(radio).toHaveAttribute('type', 'radio')
      expect(radio).toHaveAttribute('name', 'kontakt')
      expect(radio).toHaveAttribute('value', item.value)
      expect(radio).toHaveAttribute('id', `kontakt-${item.value}`)
    }
  })

  it('honours per-item disabled and defaultValue', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} defaultValue="phone" />)
    expect(screen.getByLabelText('Post')).toBeDisabled()
    expect(screen.getByLabelText('Telefon')).toBeChecked()
    expect(screen.getByLabelText('E-Mail')).not.toBeChecked()
  })

  it('puts aria-describedby on the fieldset and aria-invalid on each radio', () => {
    render(
      <RadioGroup
        name="kontakt"
        label="Kontaktart"
        items={ITEMS}
        description="Wie erreichen wir Sie?"
        error="Bitte wählen"
      />
    )
    const group = screen.getByRole('group', { name: 'Kontaktart' })
    expect(group).toHaveAttribute('aria-describedby', 'kontakt-description kontakt-error')
    // aria-invalid goes on each radio, not the fieldset: the radio role
    // supports it unambiguously, group's support is not worth relying on.
    for (const item of ITEMS) {
      expect(screen.getByLabelText(item.label)).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('omits aria-describedby entirely when there are no messages', () => {
    render(<RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} />)
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby')
  })

  it('derives item ids from an explicit id when given', () => {
    render(<RadioGroup name="kontakt" id="form2-kontakt" label="Kontaktart" items={ITEMS} />)
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('id', 'form2-kontakt-mail')
  })

  it('merges className onto the fieldset', () => {
    const { container } = render(
      <RadioGroup name="kontakt" label="Kontaktart" items={ITEMS} className="col-span-full" />
    )
    expect(container.querySelector('fieldset')).toHaveClass('sankara-field', 'col-span-full')
  })
})
