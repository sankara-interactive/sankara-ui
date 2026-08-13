'use client'

import { useEffect, useRef, type ComponentPropsWithRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

export type DialogProps = Omit<
  ComponentPropsWithRef<'dialog'>,
  'open' | 'onClose' | 'children'
> & {
  /** Controlled. The open state always lives with the consumer. */
  open: boolean
  /** A close *request* — Escape, an outside click, or a `<form method="dialog">`. */
  onRequestClose: () => void
  children: ReactNode
  /** `end` is the logical inline edge, so it flips under RTL. */
  placement?: 'center' | 'end'
  size?: 'sm' | 'md' | 'lg'
  closeOnOutsideClick?: boolean
}

// One class per size; what it means is the stylesheet's business. Centred, it
// caps the width; docked to the edge, it sets one, because a drawer wants a
// width rather than a ceiling.
const SIZES = { sm: 'sankara-dialog-sm', md: 'sankara-dialog-md', lg: 'sankara-dialog-lg' } as const

// Ref-counted so sibling dialogs do not unlock each other, and so React Strict
// Mode's double-invoked effects balance out.
// ponytail: <html> overflow only. iOS Safari ignores it — documented in the
// README rather than papered over with a position: fixed scroll-restore hack.
let lockCount = 0
let previousOverflow = ''

function lockScroll() {
  if (lockCount === 0) {
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  lockCount += 1
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.documentElement.style.overflow = previousOverflow
}

export function Dialog({
  open,
  onRequestClose,
  children,
  placement = 'center',
  size = 'md',
  closeOnOutsideClick = true,
  className,
  ref,
  // Pulled out of the spread so a consumer's handlers compose with the
  // outside-click detection instead of replacing it.
  onPointerDown,
  onPointerUp,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressedOutside = useRef(false)

  const attachRef = (node: HTMLDialogElement | null) => {
    dialogRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // Guarded: showModal() on an already-open dialog throws InvalidStateError.
    if (open) {
      if (!dialog.open) dialog.showModal()
      lockScroll()
      return unlockScroll
    }
    if (dialog.open) dialog.close()
    return
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      // Controlled: let the consumer decide, rather than closing underneath it.
      event.preventDefault()
      onRequestClose()
    }
    // Fires for our own close() too. `open` still being true is what identifies
    // a close we did not initiate — a <form method="dialog"> submission.
    // Reopen before asking: the prop is the source of truth, and a consumer that
    // declines the request would otherwise be left with a closed element and an
    // `open` prop that says otherwise. If they honour it, the effect closes it.
    const onNativeClose = () => {
      if (!open) return
      dialog.showModal()
      onRequestClose()
    }

    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onNativeClose)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onNativeClose)
    }
  }, [open, onRequestClose])

  // ::backdrop is not an event target, so a click on it reports the <dialog>
  // itself — as does a click on the dialog's own padding. Only geometry tells
  // them apart.
  const isOutside = (event: PointerEvent<HTMLDialogElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
  }

  return (
    <dialog
      ref={attachRef}
      onPointerDown={event => {
        pressedOutside.current = isOutside(event)
        onPointerDown?.(event)
      }}
      onPointerUp={event => {
        const outside = pressedOutside.current && isOutside(event)
        pressedOutside.current = false
        if (outside && closeOnOutsideClick) onRequestClose()
        onPointerUp?.(event)
      }}
      className={cn(
        'sankara-dialog',
        placement === 'end' && 'sankara-dialog-end',
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </dialog>
  )
}
