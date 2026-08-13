import type { Meta, StoryObj } from '@storybook/react'
import { RadioGroup } from './RadioGroup.js'

const meta: Meta<typeof RadioGroup> = { title: 'Forms/RadioGroup', component: RadioGroup }
export default meta

type Story = StoryObj<typeof RadioGroup>

const items = [
  { value: 'mail', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
]

export const Default: Story = { args: { name: 'kontakt', label: 'Kontaktart', items } }

export const WithError: Story = {
  args: { name: 'kontakt', label: 'Kontaktart', items, error: 'Bitte wählen Sie eine Kontaktart.' },
}
