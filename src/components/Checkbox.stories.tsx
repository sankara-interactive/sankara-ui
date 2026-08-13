import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox.js'

const meta: Meta<typeof Checkbox> = { title: 'Forms/Checkbox', component: Checkbox }
export default meta

type Story = StoryObj<typeof Checkbox>

export const Default: Story = { args: { name: 'agb', label: 'AGB akzeptieren' } }

export const WithError: Story = {
  args: { name: 'agb', label: 'AGB akzeptieren', error: 'Bitte bestätigen Sie die AGB.' },
}
