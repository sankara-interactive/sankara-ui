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

// Regression coverage for the offsetLeft/offsetParent bug: the track had no
// `relative`, so it shared an offsetParent with a centered wrapper and
// goTo() overshot the scroll target by the wrapper's left offset. Wrap in a
// centered container to reproduce the layout that exposed it.
export const InCenteredContainer: StoryObj<typeof Carousel> = {
  render: args => (
    <div className="mx-auto max-w-2xl">
      <Carousel {...args} />
    </div>
  ),
  args: {
    label: 'Referenzen',
    perView: 2.2,
    children: [1, 2, 3, 4, 5].map(n => <Slide key={n} n={n} />),
  },
}
