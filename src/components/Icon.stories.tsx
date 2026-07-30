import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './Icon.js'

const meta: Meta<typeof Icon> = { component: Icon, title: 'Icon' }
export default meta

export const Decorative: StoryObj<typeof Icon> = {
  args: { icon: faChevronDown, size: 22 },
}

export const Labelled: StoryObj<typeof Icon> = {
  args: { icon: faChevronDown, size: 22, label: 'Mehr anzeigen' },
}
