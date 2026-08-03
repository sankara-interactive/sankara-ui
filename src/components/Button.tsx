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
        not wrapped. Element-specific props go on this element. `null` and
        `false` — what a JSX conditional (`cond ? <X/> : null`) produces —
        are treated the same as omitting `render`, falling back to the
        default <button>. */
    render?: ReactElement | null | false
    /** Native attribute. A no-op with a non-button `render`, which errors in
        development. */
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    /** Applies to the default <button>. With `render`, put the ref on your own
        element — cloneElement replaces a ref rather than composing it, and
        Button errors in development if both are set. */
    ref?: Ref<HTMLButtonElement>
  } & { [key: `data-${string}`]: string | number | boolean | undefined }

type RenderProps = {
  className?: string
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLElement>) => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

// Reaches through `memo`/`forwardRef` wrappers (`.type`/`.render`) to the
// underlying function so next/link and similar wrapped components still get
// named in the dev warning below, instead of producing a blank name.
function unwrapDisplayName(type: unknown): string {
  if (typeof type === 'function') {
    return (
      (type as { displayName?: string; name?: string }).displayName ||
      (type as { name?: string }).name ||
      ''
    )
  }
  if (type && typeof type === 'object') {
    const wrapper = type as { displayName?: string; type?: unknown; render?: unknown }
    return (
      wrapper.displayName ||
      unwrapDisplayName(wrapper.type) ||
      unwrapDisplayName(wrapper.render) ||
      ''
    )
  }
  return ''
}

function describeElement(type: ReactElement['type']): string {
  if (typeof type === 'string') return `<${type}>`
  return unwrapDisplayName(type) || 'a custom component'
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
  // `render` is truthy-checked, not `!== undefined`: `null` and `false` — what
  // a JSX conditional produces for "no render" — fall through to the default
  // branch below rather than hitting this guard. A string or a number is
  // still truthy and still invalid, so it still throws.
  if (render && (!isValidElement(render) || render.type === Fragment)) {
    throw new Error(
      'Button: `render` must be a single element (an <a>, a Link, a <button>), not a fragment or a list.'
    )
  }

  if (process.env.NODE_ENV !== 'production' && ref && render) {
    console.error(
      'Button: `ref` is ignored when `render` is set — cloneElement replaces a ref rather than ' +
        'composing it. Put the ref on your own element instead.'
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
  // Either side can carry it: Button's own `disabled` prop, or the render
  // element's own (e.g. `render={<button disabled />}` or a mistaken
  // `render={<a disabled />}`). Checking only Button's prop missed the latter.
  const wantsDisabled = disabled ?? renderProps.disabled

  if (process.env.NODE_ENV !== 'production' && wantsDisabled && !isNativeButton) {
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
    // Only a real <button> gets `disabled` — on anything else it must reach
    // neither the render element's own value nor Button's, explicit
    // `undefined` so cloneElement strips whatever the render element's own
    // props carried (e.g. `render={<a disabled />}`) rather than leaving it.
    disabled: isNativeButton ? wantsDisabled : undefined,
    ...(isNativeButton ? { type: renderProps.type ?? type ?? 'button' } : {}),
  } as Partial<RenderProps> & { children: ReactNode })
}
