import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText.js'

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe('RichText', () => {
  it('wraps children in a div carrying the contract class', () => {
    const { container } = render(
      <RichText>
        <p>Wir beraten Sie gern.</p>
      </RichText>
    )
    expect(root(container).tagName).toBe('DIV')
    expect(root(container).className).toContain('sankara-richtext')
    expect(screen.getByText('Wir beraten Sie gern.')).toBeInTheDocument()
  })

  it('applies the measure by default', () => {
    const { container } = render(<RichText><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext-measure')
  })

  it('drops the measure when asked', () => {
    const { container } = render(<RichText measure={false}><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext')
    expect(root(container).className).not.toContain('sankara-richtext-measure')
  })

  it('adds no wrapper of its own around the children', () => {
    const { container } = render(
      <RichText>
        <p>Erster</p>
        <p>Zweiter</p>
      </RichText>
    )
    // Direct children, or the owl selector's flow spacing never applies.
    expect([...root(container).children].map(child => child.tagName)).toEqual(['P', 'P'])
  })

  it('merges the caller’s className rather than replacing its own', () => {
    const { container } = render(<RichText className="mt-8"><p>Text</p></RichText>)
    expect(root(container).className).toContain('sankara-richtext')
    expect(root(container).className).toContain('mt-8')
  })

  it('passes lang through, which hyphenation depends on', () => {
    const { container } = render(<RichText lang="fr"><p>Bonjour</p></RichText>)
    expect(root(container)).toHaveAttribute('lang', 'fr')
  })

  it('passes rest props and ref to the div', () => {
    const ref = { current: null as HTMLDivElement | null }
    const { container } = render(
      <RichText ref={ref} id="intro" data-testid="rt"><p>Text</p></RichText>
    )
    expect(ref.current).toBe(root(container))
    expect(root(container)).toHaveAttribute('id', 'intro')
    expect(root(container)).toHaveAttribute('data-testid', 'rt')
  })
})
