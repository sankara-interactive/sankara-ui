import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Carousel } from './Carousel.js'

const slides = [<p key="a">One</p>, <p key="b">Two</p>, <p key="c">Three</p>]

describe('Carousel', () => {
  it('labels itself as a carousel for assistive tech', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    const region = screen.getByRole('group', { name: 'Referenzen' })
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('renders every slide with a position label', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getByLabelText('1 von 3')).toBeInTheDocument()
    expect(screen.getByLabelText('3 von 3')).toBeInTheDocument()
  })

  it('renders one pagination dot per slide', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('marks the current dot as selected', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'false')
  })

  it('scrolls to a slide when its dot is activated', async () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[2]!)
    expect(scrollTo).toHaveBeenCalled()
  })

  it('moves between slides with the arrow keys', async () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    scrollTo.mockClear()
    await userEvent.keyboard('{ArrowRight}')
    expect(scrollTo).toHaveBeenCalled()
  })

  it('applies the consumer className last', () => {
    const { container } = render(
      <Carousel label="Referenzen" className="mt-12">
        {slides}
      </Carousel>
    )
    expect(container.firstElementChild?.getAttribute('class')).toMatch(/mt-12$/)
  })
})
