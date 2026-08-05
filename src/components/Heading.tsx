import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

// WithRef, not WithoutRef: under React 19 `ref` is an ordinary prop on function
// components, so it rides along in the spread — as in Disclosure and RichText.
// 'h1' is not an h1-specific choice: all six heading tags are HTMLHeadingElement.
export type HeadingProps = Omit<ComponentPropsWithRef<'h1'>, 'children'> & {
  children: ReactNode
  /** Semantic level — the document outline. Renders <h1>…<h6>. */
  level: HeadingLevel
  /** Visual level — emits `h1`…`h6`. Defaults to `level`. The package ships
      size defaults for 1–4 only; 5 and 6 are hooks for your own CSS. */
  visual?: HeadingLevel
}

export function Heading({
  level,
  visual = level,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as `h${HeadingLevel}`
  // The class is emitted even when it matches `level`. Four of the five
  // surveyed projects write an `hN, .hN` twin, where the duplicate is inert;
  // the fifth defines `.hN` and no tag rule at all, where the class is the
  // only thing that renders a heading. One behaviour covers both, and no
  // consumer has to know which kind of project they are in.
  return (
    <Tag className={cn(`h${visual}`, className)} {...props}>
      {children}
    </Tag>
  )
}
