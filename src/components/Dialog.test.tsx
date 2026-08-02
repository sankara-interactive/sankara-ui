import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog.js'

// jsdom defines neither showModal() nor close() on HTMLDialogElement — there is
// nothing to spy on, so they are assigned outright and made to move the `open`
// attribute the way a real browser would.
let showModal: ReturnType<typeof vi.fn>
let close: ReturnType<typeof vi.fn>

beforeEach(() => {
  showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
  HTMLDialogElement.prototype.showModal = showModal as HTMLDialogElement['showModal']
  HTMLDialogElement.prototype.close = close as HTMLDialogElement['close']

  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 100,
    right: 300,
    bottom: 300,
    width: 200,
    height: 200,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.style.overflow = ''
})

const noop = () => {}

describe('Dialog', () => {
  it('shows modally when open', () => {
    render(
      <Dialog open onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    expect(showModal).toHaveBeenCalledTimes(1)
  })

  it('stays shut when closed', () => {
    render(
      <Dialog open={false} onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    expect(showModal).not.toHaveBeenCalled()
  })

  it('does not call showModal again on an unrelated rerender', () => {
    const { rerender } = render(
      <Dialog open onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    rerender(
      <Dialog open onRequestClose={noop} size="lg">
        Inhalt
      </Dialog>
    )
    expect(showModal).toHaveBeenCalledTimes(1)
  })

  it('closes the element when open flips false, without calling back', () => {
    const onRequestClose = vi.fn()
    const { rerender } = render(
      <Dialog open onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    rerender(
      <Dialog open={false} onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    expect(close).toHaveBeenCalledTimes(1)
    // The close event fires, but the consumer asked for this one already.
    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('requests a close on Escape, and does not close underneath the consumer', () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)

    expect(onRequestClose).toHaveBeenCalledTimes(1)
    expect(cancel.defaultPrevented).toBe(true)
  })

  it('requests a close when the element closes on its own (form method=dialog)', () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose}>
        <form method="dialog">
          <button type="submit">Schliessen</button>
        </form>
      </Dialog>
    )
    container.querySelector('dialog')!.close()
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('reopens when the consumer declines a form-driven close', () => {
    // onRequestClose is a request. Declining it must not leave the element shut
    // while the `open` prop still says it is open.
    const { container } = render(
      <Dialog open onRequestClose={noop}>
        <form method="dialog">
          <button type="submit">Schliessen</button>
        </form>
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    dialog.close()

    expect(dialog.open).toBe(true)
    expect(showModal).toHaveBeenCalledTimes(2)
  })

  it('composes consumer pointer handlers instead of losing dismissal', async () => {
    const onRequestClose = vi.fn()
    const onPointerUp = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose} onPointerUp={onPointerUp}>
        Inhalt
      </Dialog>
    )
    await userEvent.pointer([
      { target: container.querySelector('dialog')!, coords: { clientX: 10, clientY: 10 } },
      { keys: '[MouseLeft]', coords: { clientX: 10, clientY: 10 } },
    ])
    expect(onPointerUp).toHaveBeenCalled()
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('requests a close for a click outside the panel', async () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    await userEvent.pointer([
      { target: container.querySelector('dialog')!, coords: { clientX: 10, clientY: 10 } },
      { keys: '[MouseLeft]', coords: { clientX: 10, clientY: 10 } },
    ])
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('ignores a click on the panel itself', async () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    await userEvent.pointer([
      { target: container.querySelector('dialog')!, coords: { clientX: 200, clientY: 200 } },
      { keys: '[MouseLeft]', coords: { clientX: 200, clientY: 200 } },
    ])
    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('ignores a drag that starts inside and ends outside', async () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose}>
        Inhalt
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    await userEvent.pointer([
      { target: dialog, coords: { clientX: 200, clientY: 200 }, keys: '[MouseLeft>]' },
      { target: dialog, coords: { clientX: 10, clientY: 10 } },
      { keys: '[/MouseLeft]', coords: { clientX: 10, clientY: 10 } },
    ])
    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('honours closeOnOutsideClick={false} without disabling Escape', async () => {
    const onRequestClose = vi.fn()
    const { container } = render(
      <Dialog open onRequestClose={onRequestClose} closeOnOutsideClick={false}>
        Inhalt
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    await userEvent.pointer([
      { target: dialog, coords: { clientX: 10, clientY: 10 } },
      { keys: '[MouseLeft]', coords: { clientX: 10, clientY: 10 } },
    ])
    expect(onRequestClose).not.toHaveBeenCalled()

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('locks scrolling while open and restores the previous value', () => {
    document.documentElement.style.overflow = 'scroll'
    const { rerender } = render(
      <Dialog open onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    expect(document.documentElement.style.overflow).toBe('hidden')

    rerender(
      <Dialog open={false} onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    expect(document.documentElement.style.overflow).toBe('scroll')
  })

  it('ref-counts the lock across sibling dialogs', () => {
    const { rerender } = render(
      <>
        <Dialog open onRequestClose={noop}>
          Eins
        </Dialog>
        <Dialog open onRequestClose={noop}>
          Zwei
        </Dialog>
      </>
    )
    rerender(
      <>
        <Dialog open onRequestClose={noop}>
          Eins
        </Dialog>
        <Dialog open={false} onRequestClose={noop}>
          Zwei
        </Dialog>
      </>
    )
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  it('releases the lock when unmounted while open', () => {
    const { unmount } = render(
      <Dialog open onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('applies placement and size classes', () => {
    const { container } = render(
      <Dialog open onRequestClose={noop} placement="end" size="sm">
        Inhalt
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    expect(dialog).toHaveClass('sankara-dialog-end')
    expect(dialog).toHaveClass('w-[min(20rem,85vw)]')
  })

  // Tailwind's preflight zeroes every margin, which would pin a centered modal
  // to the top-left corner instead of letting the UA centre it.
  it('keeps the auto margin that centres a modal dialog', () => {
    const { container } = render(
      <Dialog open onRequestClose={noop}>
        Inhalt
      </Dialog>
    )
    expect(container.querySelector('dialog')).toHaveClass('m-auto')
  })

  it('forwards a ref and spreads unlisted props onto the root', () => {
    let node: HTMLDialogElement | null = null
    render(
      <Dialog
        open
        onRequestClose={noop}
        ref={element => void (node = element)}
        aria-labelledby="titel"
      >
        <h2 id="titel">Standort wählen</h2>
      </Dialog>
    )
    expect(node).toBe(screen.getByRole('dialog', { hidden: true }))
    expect(node).toHaveAttribute('aria-labelledby', 'titel')
  })
})
