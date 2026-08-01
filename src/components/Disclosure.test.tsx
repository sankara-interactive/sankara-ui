import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Disclosure } from './Disclosure.js'

describe('Disclosure', () => {
  it('renders the summary as the trigger', () => {
    render(
      <Disclosure summary={<h3>Frage</h3>}>
        <p>Antwort</p>
      </Disclosure>
    )
    expect(screen.getByRole('heading', { name: 'Frage' })).toBeInTheDocument()
  })

  it('is closed unless defaultOpen is set', () => {
    const { container } = render(<Disclosure summary="Frage">Antwort</Disclosure>)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })

  it('emits the open attribute for defaultOpen', () => {
    const { container } = render(
      <Disclosure summary="Frage" defaultOpen>
        Antwort
      </Disclosure>
    )
    expect(container.querySelector('details')).toHaveAttribute('open')
  })

  it('toggles on summary click', async () => {
    const { container } = render(<Disclosure summary="Frage">Antwort</Disclosure>)
    await userEvent.click(screen.getByText('Frage'))
    expect(container.querySelector('details')).toHaveAttribute('open')
  })

  it('groups exclusively by passing name through to the details element', () => {
    const { container } = render(
      <>
        <Disclosure summary="Eins" name="faq-1">
          A
        </Disclosure>
        <Disclosure summary="Zwei" name="faq-1">
          B
        </Disclosure>
      </>
    )
    const names = [...container.querySelectorAll('details')].map(d => d.getAttribute('name'))
    expect(names).toEqual(['faq-1', 'faq-1'])
  })

  it('omits the name attribute when independently openable', () => {
    const { container } = render(<Disclosure summary="Frage">Antwort</Disclosure>)
    expect(container.querySelector('details')).not.toHaveAttribute('name')
  })

  it('renders children directly, with no wrapper element', () => {
    const { container } = render(
      <Disclosure summary="Frage">
        <p data-testid="answer">Antwort</p>
      </Disclosure>
    )
    expect(screen.getByTestId('answer').parentElement).toBe(container.querySelector('details'))
  })

  it('spreads unlisted props onto the root, which is how microdata lands', () => {
    const { container } = render(
      <Disclosure summary="Frage" itemScope itemType="https://schema.org/Question">
        Antwort
      </Disclosure>
    )
    expect(container.querySelector('details')).toHaveAttribute(
      'itemtype',
      'https://schema.org/Question'
    )
  })

  it('replaces the default indicator when one is supplied', () => {
    render(
      <Disclosure summary="Frage" indicator={<span data-testid="chevron" />}>
        Antwort
      </Disclosure>
    )
    expect(screen.getByTestId('chevron')).toBeInTheDocument()
  })

  it('applies the consumer className last', () => {
    const { container } = render(
      <Disclosure summary="Frage" className="border-t">
        Antwort
      </Disclosure>
    )
    expect(container.querySelector('details')?.getAttribute('class')).toMatch(/border-t$/)
  })
})
