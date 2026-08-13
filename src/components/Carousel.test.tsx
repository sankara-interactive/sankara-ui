import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Carousel } from './Carousel.js'

const slides = [<p key="a">One</p>, <p key="b">Two</p>, <p key="c">Three</p>]

describe('Carousel', () => {
  let scrollTo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
  })

  afterEach(() => {
    delete (Element.prototype as { scrollTo?: unknown }).scrollTo
  })

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

  it('scrolls to a slide and marks its dot current when the dot is activated', async () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[2]!)
    // jsdom reports offsetLeft === 0 for every element, so `left: 0` here is
    // an artifact of the test environment, not evidence the scroll target is
    // correct — real coverage for that lives in the InCenteredContainer story.
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
    expect(screen.getAllByRole('button')[2]).toHaveAttribute('aria-current', 'true')
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'false')
  })

  it('moves forward one slide on ArrowRight', async () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    ;(container.querySelector('[tabindex="0"]') as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'true')
  })

  it('moves back one slide on ArrowLeft', async () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[2]!)
    ;(container.querySelector('[tabindex="0"]') as HTMLElement).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'true')
  })

  it('does not move past the last slide', async () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[2]!)
    ;(container.querySelector('[tabindex="0"]') as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('button')[2]).toHaveAttribute('aria-current', 'true')
  })

  it('does not move before the first slide', async () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    ;(container.querySelector('[tabindex="0"]') as HTMLElement).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
  })

  it('ignores arrow keys that bubble up from outside the track (e.g. a slide with its own input)', async () => {
    render(
      <Carousel label="Referenzen">
        <input aria-label="search" />
        <p key="b">Two</p>
        <p key="c">Three</p>
      </Carousel>
    )
    screen.getByLabelText('search').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
  })

  it('applies the consumer className last', () => {
    const { container } = render(
      <Carousel label="Referenzen" className="mt-12">
        {slides}
      </Carousel>
    )
    expect(container.firstElementChild?.getAttribute('class')).toMatch(/mt-12$/)
  })

  it('exposes the scroll track to keyboard focus', () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    const track = container.querySelector('[tabindex="0"]')
    expect(track).toBeInTheDocument()
    // The overflow itself now lives on .sankara-carousel-track in tokens.css
    // (D9), asserted in carousel-css.test.ts; here only the wiring.
    expect(track?.className).toMatch(/sankara-carousel-track/)
  })

  it('moves slides with the arrow keys when the track itself has focus', async () => {
    const { container } = render(<Carousel label="Referenzen">{slides}</Carousel>)
    const track = container.querySelector('[tabindex="0"]') as HTMLElement
    track.focus()
    expect(track).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'true')
  })

  it('carries the namespaced root class and publishes perView/gap as PRIVATE variables', () => {
    const { container } = render(
      <Carousel label="Referenzen" perView={2.5} gap={20}>
        {slides}
      </Carousel>
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('sankara-carousel')
    expect(root.style.getPropertyValue('--_carousel-per-view')).toBe('2.5')
    expect(root.style.getPropertyValue('--_carousel-gap')).toBe('20px')
    // The PUBLIC names must never be set inline — an inline declaration would
    // beat every consumer stylesheet rule, killing per-breakpoint overrides.
    expect(root.style.getPropertyValue('--carousel-per-view')).toBe('')
    expect(root.style.getPropertyValue('--carousel-gap')).toBe('')
  })

  it('sizes slides via the stylesheet class, not an inline flex-basis', () => {
    const { container } = render(
      <Carousel label="Referenzen" perView={3}>
        {slides}
      </Carousel>
    )
    const slide = container.querySelector('[aria-roledescription="slide"]') as HTMLElement
    expect(slide.className).toContain('sankara-carousel-slide')
    expect(slide.style.flexBasis).toBe('')
  })

  it('colours dots via the namespaced class, not hardcoded utilities', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    for (const dot of screen.getAllByRole('button')) {
      expect(dot.className).toContain('sankara-carousel-dot')
      expect(dot.className).not.toMatch(/bg-primary|bg-muted/)
    }
  })
})
