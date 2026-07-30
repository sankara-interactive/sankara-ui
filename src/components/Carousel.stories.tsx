import type { Meta, StoryObj } from '@storybook/react'
import { Carousel } from './Carousel.js'

const meta: Meta<typeof Carousel> = { component: Carousel, title: 'Carousel' }
export default meta

const Slide = ({ n }: { n: number }) => (
  <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-surface text-on-surface shadow-raised">
    Slide {n}
  </div>
)

export const Single: StoryObj<typeof Carousel> = {
  args: {
    label: 'Referenzen',
    children: [1, 2, 3].map(n => <Slide key={n} n={n} />),
  },
}

export const Peeking: StoryObj<typeof Carousel> = {
  args: {
    label: 'Referenzen',
    perView: 2.2,
    children: [1, 2, 3, 4, 5].map(n => <Slide key={n} n={n} />),
  },
}
