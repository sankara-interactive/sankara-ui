import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

// WithRef, not WithoutRef: under React 19 `ref` is an ordinary prop on function
// components, so it rides along in the spread — as in Disclosure.
export type RichTextProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** CMS output, rendered by the consumer. Rendered as direct children so the
      stylesheet's flow spacing reaches them. */
  children: ReactNode
  /** Constrain line length to --richtext-measure. Default true. */
  measure?: boolean
}

export function RichText({ children, measure = true, className, ...props }: RichTextProps) {
  return (
    <div
      // `sankara-richtext` carries the whole contract and ships in @layer base,
      // :where()-wrapped, so your own element rules win. See styles.css.
      className={cn('sankara-richtext', measure && 'sankara-richtext-measure', className)}
      {...props}
    >
      {children}
    </div>
  )
}
