import {
  Fragment,
  cloneElement,
  isValidElement,
  type AriaAttributes,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '../utilities/cn.js'

// Deliberately not the whole <button> prop set: formAction, name, value and
// form are meaningless on an anchor, and href can never be passed here at all.
// Element-specific props belong on the element handed to `render`.
type SharedProps = Pick<
  ComponentPropsWithoutRef<'button'>,
  'id' | 'onClick' | 'onFocus' | 'onBlur' | 'title' | 'tabIndex' | 'style'
>

export type ButtonProps = SharedProps &
  AriaAttributes & {
    children: ReactNode
    /** Render as something else — next/link, an SbLink, a plain <a>. Cloned,
        not wrapped. Element-specific props go on this element. */
    render?: ReactElement
    /** Native attribute. A no-op with a non-button `render`, which errors in
        development. */
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    /** Applies to the default <button>. With `render`, put the ref on your own
        element — cloneElement replaces a ref rather than composing it. */
    ref?: Ref<HTMLButtonElement>
  } & { [key: `data-${string}`]: string | number | boolean | undefined }

type RenderProps = {
  className?: string
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLElement>) => void
  type?: 'button' | 'submit' | 'reset'
}

function describeElement(type: ReactElement['type']): string {
  if (typeof type === 'string') return `<${type}>`
  return (type as { displayName?: string; name?: string }).displayName ??
    (type as { name?: string }).name ??
    'a custom component'
}

export function Button({
  children,
  render,
  disabled,
  type,
  className,
  style,
  onClick,
  ref,
  ...props
}: ButtonProps) {
  if (render !== undefined && (!isValidElement(render) || render.type === Fragment)) {
    throw new Error(
      'Button: `render` must be a single element (an <a>, a Link, a <button>), not a fragment or a list.'
    )
  }

  if (!render) {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled}
        className={cn('sankara-button', className)}
        style={style}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    )
  }

  const renderProps = render.props as RenderProps
  // Reliable for an intrinsic element, impossible for a custom component: one
  // that renders a <button> is treated as a link. Documented in the spec's D4.
  const isNativeButton = render.type === 'button'

  if (process.env.NODE_ENV !== 'production' && disabled && !isNativeButton) {
    console.error(
      `Button: \`disabled\` does nothing on ${describeElement(render.type)}. A disabled link is not ` +
        'a thing in HTML — do not render the link instead of disabling it.'
    )
  }

  const composedClick =
    onClick || renderProps.onClick
      ? (event: MouseEvent<HTMLElement>) => {
          onClick?.(event as MouseEvent<HTMLButtonElement>)
          renderProps.onClick?.(event)
        }
      : undefined

  return cloneElement(render, {
    // Ours first, then the render element's own — it is their element, so their
    // props win any collision the merge table does not name explicitly.
    ...props,
    ...renderProps,
    className: cn('sankara-button', renderProps.className, className),
    // cloneElement merges props shallowly, so style must be merged by hand.
    style: { ...style, ...renderProps.style },
    onClick: composedClick,
    children,
    ...(isNativeButton
      ? { type: renderProps.type ?? type ?? 'button', disabled }
      : {}),
  } as Partial<RenderProps> & { children: ReactNode })
}
