import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox.js'
import { Input } from './Input.js'
import { RadioGroup } from './RadioGroup.js'
import { Select } from './Select.js'
import { Textarea } from './Textarea.js'

const meta: Meta = { title: 'Forms/Whole form' }
export default meta

type Story = StoryObj

const items = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
]

export const NoLibrary: Story = {
  render: () => (
    <form className="sankara-field">
      <Input name="email" label="E-Mail" type="email" required />
      <Textarea name="message" label="Nachricht" required />
      <Select name="thema" label="Thema">
        <option value="">Bitte wählen</option>
        <option value="bug">Fehler melden</option>
      </Select>
      <RadioGroup name="kontakt" label="Kontaktart" items={items} />
      <Checkbox name="agb" label="AGB akzeptieren" required />
    </form>
  ),
}

/** What react-hook-form's register() spreads: name, onChange, onBlur, ref.
    `name` is required on the component, but the spread alone satisfies it --
    no explicit `name` prop needed alongside it. */
export const ReactHookFormShape: Story = {
  render: () => {
    const register = (fieldName: string) => ({
      name: fieldName,
      onChange: () => {},
      onBlur: () => {},
    })
    return (
      <form className="sankara-field">
        <Input label="E-Mail" {...register('email')} error="Ungültige Adresse" />
        <Textarea label="Nachricht" {...register('message')} />
      </form>
    )
  },
}

/** What conform's getInputProps() spreads: its own id, name and aria-*,
    pointing at its own error element. Rest props win (D4), so those survive
    and the consumer does not pass `error`. */
export const ConformShape: Story = {
  render: () => {
    const conformProps = {
      id: 'contact-email',
      name: 'email',
      'aria-describedby': 'contact-email-error',
      'aria-invalid': true as const,
    }
    return (
      <form className="sankara-field">
        <Input label="E-Mail" {...conformProps} />
        <p id="contact-email-error" className="sankara-field-error">
          Ungültige Adresse
        </p>
      </form>
    )
  },
}
