'use client'

import { Children, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../utilities/cn.js'
import { slideIndexFromScroll } from '../utilities/carousel.js'

export type CarouselProps = {
  children: ReactNode
  /** Accessible name for the carousel as a whole. Required. */
  label: string
  /** Slides visible at once. Fractional values peek the next slide. */
  perView?: number
  /** Gap between slides, in pixels. */
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
    setIndex(slideIndexFromScroll(track.scrollLeft, first?.offsetWidth ?? 0, gap))
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
      className={cn('flex flex-col gap-6', className)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        className="relative flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} von ${slides.length}`}
            className="shrink-0 snap-start"
            style={{ flexBasis: `calc((100% - ${(perView - 1) * gap}px) / ${perView})` }}
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className={cn(
              'h-2.5 rounded-card transition-all',
              i === index ? 'w-8 bg-primary' : 'w-2.5 bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  )
}
