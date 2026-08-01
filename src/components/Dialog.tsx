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

const SIZES = {
  center: { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' },
  end: { sm: 'w-[min(20rem,85vw)]', md: 'w-[min(28rem,90vw)]', lg: 'w-[min(36rem,95vw)]' },
} as const

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
    const onNativeClose = () => {
      if (open) onRequestClose()
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
      }}
      onPointerUp={event => {
        const outside = pressedOutside.current && isOutside(event)
        pressedOutside.current = false
        if (outside && closeOnOutsideClick) onRequestClose()
      }}
      className={cn(
        // m-auto restores the UA centering of a modal dialog. Tailwind's
        // preflight resets margin to 0 on every element, which otherwise pins
        // the dialog to the top-left corner.
        'sankara-dialog m-auto',
        placement === 'end' && 'sankara-dialog-end my-0 me-0 ms-auto h-dvh max-h-dvh overflow-y-auto',
        SIZES[placement][size],
        className
      )}
      {...props}
    >
      {children}
    </dialog>
  )
}
