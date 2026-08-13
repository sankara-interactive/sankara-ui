import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './Textarea.js'

const meta: Meta<typeof Textarea> = { title: 'Forms/Textarea', component: Textarea }
export default meta

type Story = StoryObj<typeof Textarea>

export const Default: Story = { args: { name: 'message', label: 'Nachricht' } }

export const WithError: Story = {
  args: { name: 'message', label: 'Nachricht', error: 'Bitte schreiben Sie uns etwas.' },
}
