import { cn } from '../utilities/cn.js'

export type FaIconProps = {
  /** FontAwesome class name(s) — `"fa-bullseye"`, or with an explicit style
      prefix like `"fa-brands fa-linkedin-in"`. A bare glyph name gets
      `fa-solid` prepended. Typically CMS-driven; a non-string or empty value
      renders nothing. */
  name: string
  /** Explicit pixel size. Omit to inherit the surrounding font size. */
  size?: number
  /** Accessible name. Omit for purely decorative icons. */
  label?: string
  className?: string
}

const HAS_STYLE_PREFIX = /\bfa-(solid|regular|brands|light|thin|duotone|sharp)\b/

/**
 * Webfont FontAwesome icon addressed by class name, for icon names that only
 * exist at runtime — Storyblok fields where editors type `fa-*` names. The
 * consumer must load a FontAwesome kit (or webfont CSS); this component only
 * emits the `<i>` element the kit styles. For code-authored icons prefer
 * `Icon` (`@sankara-ui/core/icon`), which renders self-contained SVG.
 */
export function FaIcon({ name, size, label, className }: FaIconProps) {
  // CMS trust boundary: a retyped Storyblok field can deliver an object or
  // nothing at runtime regardless of what the generated types claim. Render
  // nothing rather than crash a server render.
  if (typeof name !== 'string' || name.trim() === '') return null
  const classes = HAS_STYLE_PREFIX.test(name) ? name : `fa-solid ${name}`
  return (
    <i
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(classes, 'inline-flex shrink-0 items-center justify-center leading-none', className)}
      style={size ? { fontSize: size, width: size, height: size } : undefined}
    />
  )
}
