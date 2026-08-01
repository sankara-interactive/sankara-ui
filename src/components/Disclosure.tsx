import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

// WithRef, not WithoutRef: under React 19 `ref` is an ordinary prop on function
// components, so it rides along in the spread and reaches the <details> root.
export type DisclosureProps = Omit<ComponentPropsWithRef<'details'>, 'children' | 'open'> & {
  /** The trigger. Supply your own heading element — it stays your markup. */
  summary: ReactNode
  /** The disclosed region. Rendered directly, with no wrapper element. */
  children: ReactNode
  /** Open on first render. Uncontrolled afterwards — the browser owns the state. */
  defaultOpen?: boolean
  /** Replaces the default chevron. Rotate it yourself via `group-open:`. */
  indicator?: ReactNode
  summaryClassName?: string
}

// Drawn rather than shipped: the package deliberately carries no icon set, and
// a border-corner chevron needs no dependency. Pointing down at rest, up when
// the parent <details> is open.
function DefaultIndicator() {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rotate-45 border-r-2 border-b-2 border-current opacity-60 transition-transform [transition-duration:var(--duration-expand)] group-open:rotate-[225deg]"
    />
  )
}

export function Disclosure({
  summary,
  children,
  defaultOpen,
  indicator,
  className,
  summaryClassName,
  ...props
}: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      // `sankara-disclosure` carries the ::details-content transition, which
      // Tailwind utilities cannot express readably. Ships in styles.css.
      className={cn('sankara-disclosure group', className)}
      {...props}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-4',
          // Safari draws its own marker and ignores list-style: none.
          '[&::-webkit-details-marker]:hidden',
          summaryClassName
        )}
      >
        {summary}
        {indicator ?? <DefaultIndicator />}
      </summary>
      {children}
    </details>
  )
}
