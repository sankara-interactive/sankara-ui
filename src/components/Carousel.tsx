'use client'

import clsx from 'clsx'
import {
  ButtonHTMLAttributes,
  createContext,
  Dispatch,
  DragEvent,
  HTMLAttributes,
  ReactNode,
  RefObject,
  useContext,
  useRef,
  useState,
} from 'react'

const CarouselContext = createContext<{
  carouselRef: RefObject<HTMLDivElement | null>
  scrollRefs: RefObject<Map<number, HTMLDivElement> | null>
  getScrollRefs: () => Map<number, HTMLDivElement>
  activeSlide: number
  setActiveSlide: Dispatch<React.SetStateAction<number>>
  navigate: (index: number) => void
} | null>(null)

function useCarouselContext() {
  const context = useContext(CarouselContext)

  if (!context) {
    throw new Error('Carousel components must be used within a Carousel')
  }

  return context
}

// Based on React Carousel with CSS Snap Scroll by Emil Yangirow: https://codepen.io/yangirov/pen/WNBvoZB

export function Carousel({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const scrollRefs = useRef<Map<number, HTMLDivElement> | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)

  function getScrollRefs() {
    if (!scrollRefs.current) {
      scrollRefs.current = new Map()
    }

    return scrollRefs.current
  }

  function navigate(index: number) {
    const slides = Array.from(getScrollRefs().keys())
    index = (index + slides.length) % slides.length
    const slide = getScrollRefs().get(index)
    slide?.scrollIntoView({
      block: 'nearest',
      // @ts-expect-error - the `container` is not yet supported in all browsers
      container: 'nearest',
    })
  }

  return (
    <CarouselContext
      value={{ carouselRef, scrollRefs, getScrollRefs, activeSlide, setActiveSlide, navigate }}
    >
      <div {...props}>{children}</div>
    </CarouselContext>
  )
}

export function CarouselTrack({
  children: slides,
  className,
  ...props
}: { children: ReactNode[] } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onScroll' | 'onDragStart' | 'draggable'
>) {
  const { carouselRef, getScrollRefs, setActiveSlide } = useCarouselContext()

  function handleScroll() {
    if (!carouselRef.current) {
      return
    }

    const { scrollLeft, clientWidth } = carouselRef.current
    const index = Math.round(scrollLeft / clientWidth)
    setActiveSlide(index)
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className={clsx(
        'flex snap-x snap-mandatory scrollbar-none flex-nowrap overflow-x-auto scroll-smooth',
        className
      )}
      ref={carouselRef}
      onScroll={handleScroll}
      draggable={false}
      onDragStart={handleDragStart}
      {...props}
    >
      {slides?.map((item, index) => (
        <div
          key={index}
          ref={node => {
            if (!node) {
              return
            }

            const refs = getScrollRefs()
            refs.set(index, node)

            return () => {
              refs.delete(index)
            }
          }}
          className="size-full shrink-0 snap-center snap-always select-none"
        >
          {item}
        </div>
      ))}
    </div>
  )
}

export function CarouselArrow({
  direction,
  children,
  ...props
}: {
  direction: 'prev' | 'next'
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const { activeSlide, navigate } = useCarouselContext()

  return (
    <button
      {...props}
      onClick={() => navigate(direction === 'prev' ? activeSlide - 1 : activeSlide + 1)}
    >
      {children}
    </button>
  )
}
export function CarouselDots({ ...props }: HTMLAttributes<HTMLDivElement>) {
  const { activeSlide, navigate, getScrollRefs } = useCarouselContext()
  const slidesLength = getScrollRefs().size

  return (
    <div {...props}>
      {Array.from({ length: slidesLength }, (_, index) => (
        <button
          key={index}
          className={clsx(
            'size-2 cursor-pointer rounded-full transition-[width] duration-300',
            index === activeSlide ? 'w-5 bg-white' : 'bg-white/50'
          )}
          onClick={() => navigate(index)}
          aria-label={`Slide ${index + 1} of ${slidesLength}`}
        />
      ))}
    </div>
  )
}
