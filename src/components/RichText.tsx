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
      // `sankara-richtext` carries the whole contract. It ships in @layer base
      // with :where() on this class only, so every rule lands at the
      // specificity of a bare element selector: tied with preflight, and tied
      // with a consumer's own bare `h2`. A class-scoped rule or a Tailwind
      // utility beats it outright; a bare element rule beats it only because
      // the consumer's CSS loads after ours. See styles.css and the README's
      // install order.
      className={cn('sankara-richtext', measure && 'sankara-richtext-measure', className)}
      {...props}
    >
      {children}
    </div>
  )
}
