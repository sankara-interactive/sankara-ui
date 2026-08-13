// Icon is deliberately absent: it lives at '@sankara-ui/core/icon' so this
// barrel never pulls the optional FontAwesome peers into a consumer that
// doesn't render icons. Re-exporting it here breaks that for everyone.
export { cn } from './utilities/cn.js'
export { TOKENS } from './styles/tokens.js'
export { Carousel, type CarouselProps } from './components/Carousel.js'
export { Button, type ButtonProps } from './components/Button.js'
export { Disclosure, type DisclosureProps } from './components/Disclosure.js'
export { Popover, type PopoverProps, type PopoverPlacement } from './components/Popover.js'
export { RichText, type RichTextProps } from './components/RichText.js'
export { Heading, type HeadingProps, type HeadingLevel } from './components/Heading.js'
export { Dialog, type DialogProps } from './components/Dialog.js'
// FaIcon has no FontAwesome imports (it only emits the <i> a kit styles), so
// unlike Icon it is safe in the barrel.
export { FaIcon, type FaIconProps } from './components/FaIcon.js'
export { slideIndexFromScroll } from './utilities/carousel.js'
export { Field, fieldWiring } from './components/Field.js'
export type { FieldProps, FieldWiring, SharedFieldProps } from './components/Field.js'
