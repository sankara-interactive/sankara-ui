'use client'

import {
  Children,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../utilities/cn.js'
import { slideIndexFromScroll } from '../utilities/carousel.js'

export type CarouselProps = {
  children: ReactNode
  /** Accessible name for the carousel as a whole. Required. */
  label: string
  /** Slides visible at once. Fractional values peek the next slide. Sets
      `--carousel-per-view` on the root; override it per breakpoint in your own
      CSS for responsive slide widths. */
  perView?: number
  /** Gap between slides, in pixels. Sets `--carousel-gap` on the root. */
  gap?: number
  className?: string
}

// jsdom does not implement matchMedia, so guard rather than assume it exists.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Carousel({ children, label, perView = 1, gap = 16, className }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const slides = Children.toArray(children)

  const goTo = (target: number) => {
    const track = trackRef.current
    const slide = track?.children[target] as HTMLElement | undefined
    if (!track || !slide) return
    track.scrollTo({ left: slide.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    setIndex(target)
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const first = track.children[0] as HTMLElement | undefined
    // The rendered gap can differ from the prop when a consumer overrides
    // --carousel-gap per breakpoint, so measure it rather than trust the prop.
    const liveGap = Number.parseFloat(getComputedStyle(track).columnGap) || gap
    setIndex(slideIndexFromScroll(track.scrollLeft, first?.offsetWidth ?? 0, liveGap))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== trackRef.current) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(Math.min(index + 1, slides.length - 1))
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(Math.max(index - 1, 0))
    }
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('sankara-carousel', className)}
      style={
        // The props land in PRIVATE variables: an inline declaration of the
        // public name would beat any consumer stylesheet rule, and
        // per-breakpoint overrides of --carousel-per-view are the whole point.
        // The stylesheet reads the public name first, the prop as fallback.
        {
          '--_carousel-per-view': perView,
          '--_carousel-gap': `${gap}px`,
        } as CSSProperties
      }
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        className="sankara-carousel-track"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} von ${slides.length}`}
            className="sankara-carousel-slide"
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="sankara-carousel-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className="sankara-carousel-dot"
          />
        ))}
      </div>
    </div>
  )
}
