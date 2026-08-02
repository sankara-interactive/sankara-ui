'use client'

import {
  Fragment,
  cloneElement,
  isValidElement,
  useId,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '../utilities/cn.js'

export type PopoverPlacement =
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'top-start'
  | 'top'
  | 'top-end'

export type PopoverProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'id' | 'children' | 'popover'
> & {
  /** Defaults to a sanitised useId(). If given: document-unique, and a valid
      CSS identifier — it becomes an anchor-name. */
  id?: string
  /** A <button type="button"> or button-like <input>. Cloned, not wrapped. */
  trigger: ReactElement<ComponentPropsWithoutRef<'button'>>
  /** Mapped to position-area in styles.css. */
  placement?: PopoverPlacement
  children: ReactNode
}

// React's useId contains characters that are invalid in a CSS identifier
// (guillemets in 19, colons in 18) and the value doubles as an anchor-name.
function toCssIdent(value: string): string {
  return `sp${value.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function Popover({
  id,
  trigger,
  placement = 'bottom-start',
  className,
  children,
  style,
  onClick,
  ...props
}: PopoverProps) {
  const generatedId = useId()
  const panelId = id ?? toCssIdent(generatedId)

  if (!isValidElement(trigger) || trigger.type === Fragment) {
    throw new Error(
      'Popover: `trigger` must be a single element (a <button>), not a fragment or a list.'
    )
  }

  const triggerProps = trigger.props as Partial<ComponentPropsWithoutRef<'button'>>
  // The anchor names travel as one custom property; every anchor declaration
  // itself lives in styles.css, keyed off .sankara-popover-trigger and
  // .sankara-popover. Verified in Chrome 150 — see the spec's D3.
  const anchor = { ['--sankara-anchor' as string]: `--${panelId}` } as CSSProperties

  const wiredTrigger = cloneElement(trigger, {
    popoverTarget: panelId,
    className: cn(triggerProps.className, 'sankara-popover-trigger'),
    // cloneElement merges props shallowly, so style must be merged by hand or
    // the caller's own style object is replaced outright.
    style: { ...triggerProps.style, ...anchor },
  })

  // popover="auto" light-dismisses on clicks *outside* the panel. A link inside
  // it navigates, and with App Router the header layout survives, so the panel
  // would stay open over the new page. Optional call: jsdom and pre-popover
  // browsers have no hidePopover.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    const link = (event.target as HTMLElement).closest?.('a[href]')
    if (!link || link.hasAttribute('download')) return
    const target = link.getAttribute('target')
    if (target && target !== '_self') return
    event.currentTarget.hidePopover?.()
  }

  return (
    <>
      {wiredTrigger}
      <div
        id={panelId}
        popover="auto"
        data-placement={placement}
        className={cn('sankara-popover', className)}
        style={{ ...style, ...anchor }}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    </>
  )
}
