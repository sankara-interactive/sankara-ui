import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Heading, type HeadingLevel } from './Heading.js'

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement
const levels: HeadingLevel[] = [1, 2, 3, 4, 5, 6]

describe('Heading', () => {
  it.each(levels)('renders level %i as its matching tag', level => {
    const { container } = render(<Heading level={level}>Titel</Heading>)
    expect(root(container).tagName).toBe(`H${level}`)
  })

  // D3: emitted even when it matches `level`. Projects shaped like numbers.ch
  // define `.h1` and no `h1` rule, where the class is the only thing that
  // renders a heading at all.
  it.each(levels)('emits the class for level %i even with no visual override', level => {
    const { container } = render(<Heading level={level}>Titel</Heading>)
    expect(root(container)).toHaveClass(`h${level}`)
  })

  // The estate's dominant call site, 29 occurrences: a card title demoted
  // visually, kept correct in the outline.
  it('decouples the visual level from the semantic one', () => {
    const { container } = render(
      <Heading level={3} visual={4}>
        Kartentitel
      </Heading>
    )
    expect(root(container).tagName).toBe('H3')
    expect(root(container)).toHaveClass('h4')
    expect(root(container)).not.toHaveClass('h3')
  })

  it('merges className rather than replacing it', () => {
    const { container } = render(
      <Heading level={2} visual={4} className="mb-0 text-brown">
        Titel
      </Heading>
    )
    expect(root(container)).toHaveClass('h4', 'mb-0', 'text-brown')
  })

  it('passes rest props and ref through to the element', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(
      <Heading level={2} id="anchor" lang="de" ref={ref}>
        Titel
      </Heading>
    )
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveAttribute('id', 'anchor')
    expect(heading).toHaveAttribute('lang', 'de')
    expect(ref.current).toBe(heading)
  })

  it('renders children with no wrapper of its own', () => {
    const { container } = render(
      <Heading level={2}>
        Wir beraten <em>Sie</em> gern
      </Heading>
    )
    expect(root(container).querySelector('em')?.textContent).toBe('Sie')
    expect(root(container).children).toHaveLength(1)
  })
})
