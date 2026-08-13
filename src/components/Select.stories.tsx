import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select.js'

const meta: Meta<typeof Select> = { title: 'Forms/Select', component: Select }
export default meta

type Story = StoryObj<typeof Select>

export const Default: Story = {
  render: () => (
    <Select name="thema" label="Thema">
      <option value="">Bitte wählen</option>
      <optgroup label="Support">
        <option value="bug">Fehler melden</option>
        <option value="account">Konto</option>
      </optgroup>
      <optgroup label="Sonstiges">
        <option value="presse">Presse</option>
      </optgroup>
    </Select>
  ),
}

export const WithError: Story = {
  render: () => (
    <Select name="thema" label="Thema" error="Bitte wählen Sie ein Thema.">
      <option value="">Bitte wählen</option>
      <option value="bug">Fehler melden</option>
    </Select>
  ),
}
