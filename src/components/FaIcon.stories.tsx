import type { Meta, StoryObj } from '@storybook/react'
import { FaIcon } from './FaIcon.js'

// Renders as an empty box unless a FontAwesome kit / webfont CSS is loaded in
// .storybook/preview-head.html — the component only emits the <i> element.
const meta: Meta<typeof FaIcon> = { component: FaIcon, title: 'FaIcon' }
export default meta

export const Decorative: StoryObj<typeof FaIcon> = {
  args: { name: 'fa-bullseye', size: 22 },
}

export const Brand: StoryObj<typeof FaIcon> = {
  args: { name: 'fa-brands fa-linkedin-in', size: 22, label: 'LinkedIn' },
}
