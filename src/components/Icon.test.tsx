import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon.js'

describe('Icon', () => {
  it('renders the supplied icon as an svg', () => {
    const { container } = render(<Icon icon={faChevronDown} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('exposes an accessible name when given a label', () => {
    render(<Icon icon={faChevronDown} label="Mehr anzeigen" />)
    expect(screen.getByRole('img', { name: 'Mehr anzeigen' })).toBeInTheDocument()
  })

  it('is hidden from assistive tech when it has no label', () => {
    const { container } = render(<Icon icon={faChevronDown} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the consumer className last', () => {
    const { container } = render(<Icon icon={faChevronDown} className="text-muted" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/text-muted$/)
  })

  it('sets an explicit pixel size when asked', () => {
    const { container } = render(<Icon icon={faChevronDown} size={22} />)
    expect(container.querySelector('svg')).toHaveStyle({ width: '22px', height: '22px' })
  })
})
