import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FaIcon } from './FaIcon.js'

const iconOf = (container: HTMLElement) => container.querySelector('i')

describe('FaIcon', () => {
  it('prepends fa-solid to a bare glyph name', () => {
    const { container } = render(<FaIcon name="fa-bullseye" />)
    expect(iconOf(container)?.className).toContain('fa-solid fa-bullseye')
  })

  it('keeps an explicit style prefix untouched', () => {
    const { container } = render(<FaIcon name="fa-brands fa-linkedin-in" />)
    const className = iconOf(container)?.className ?? ''
    expect(className).toContain('fa-brands fa-linkedin-in')
    expect(className).not.toContain('fa-solid')
  })

  it('is aria-hidden without a label', () => {
    const { container } = render(<FaIcon name="fa-check" />)
    const icon = iconOf(container)
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).not.toHaveAttribute('role')
  })

  it('is an img with an accessible name when labelled', () => {
    const { container } = render(<FaIcon name="fa-check" label="Erledigt" />)
    const icon = iconOf(container)
    expect(icon).toHaveAttribute('role', 'img')
    expect(icon).toHaveAttribute('aria-label', 'Erledigt')
    expect(icon).not.toHaveAttribute('aria-hidden')
  })

  it('sizes via font-size and a square box', () => {
    const { container } = render(<FaIcon name="fa-check" size={22} />)
    const icon = iconOf(container)
    expect(icon?.style.fontSize).toBe('22px')
    expect(icon?.style.width).toBe('22px')
    expect(icon?.style.height).toBe('22px')
  })

  it('inherits the surrounding font size when size is omitted', () => {
    const { container } = render(<FaIcon name="fa-check" />)
    expect(iconOf(container)?.getAttribute('style')).toBeNull()
  })

  it('renders nothing for an empty name', () => {
    const { container } = render(<FaIcon name="  " />)
    expect(iconOf(container)).toBeNull()
  })

  it('renders nothing when a CMS field delivers a non-string at runtime', () => {
    const { container } = render(
      <FaIcon name={{ filename: 'oops.svg' } as unknown as string} />
    )
    expect(iconOf(container)).toBeNull()
  })

  it('applies the consumer className last', () => {
    const { container } = render(<FaIcon name="fa-check" className="text-white" />)
    expect(iconOf(container)?.className).toMatch(/text-white$/)
  })
})
