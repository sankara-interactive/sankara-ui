import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input.js'

const meta: Meta<typeof Input> = { title: 'Forms/Input', component: Input }
export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = { args: { name: 'email', label: 'E-Mail', type: 'email' } }

export const WithDescription: Story = {
  args: { name: 'email', label: 'E-Mail', description: 'Wir schreiben Ihnen nur einmal.' },
}

export const WithError: Story = {
  args: { name: 'email', label: 'E-Mail', error: 'Bitte geben Sie eine gültige Adresse ein.' },
}
