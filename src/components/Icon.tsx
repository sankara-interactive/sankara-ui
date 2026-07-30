import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '../utilities/cn.js'

export type IconProps = {
  /** An IconDefinition from whichever FontAwesome package the consumer installs. */
  icon: IconProp
  /** Explicit pixel size. Omit to inherit the surrounding font size. */
  size?: number
  /** Accessible name. Omit for purely decorative icons. */
  label?: string
  className?: string
}

export function Icon({ icon, size, label, className }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      // Inert under FA7 — its core bakes role="img" in and react-fontawesome
      // drops a falsy override — but kept deliberately: FA6 is inside the peer
      // range and has not been verified to do the same. aria-hidden is what
      // actually hides decorative icons, and it does work on both.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={size ? { width: size, height: size } : undefined}
      className={cn('inline-block shrink-0', className)}
    />
  )
}
