// Icon is deliberately absent: it lives at '@sankara-ui/core/icon' so this
// barrel never pulls the optional FontAwesome peers into a consumer that
// doesn't render icons. Re-exporting it here breaks that for everyone.
export { cn } from './utilities/cn.js'
export { TOKENS } from './styles/tokens.js'
export { Carousel, type CarouselProps } from './components/Carousel.js'
export { Disclosure, type DisclosureProps } from './components/Disclosure.js'
export { Dialog, type DialogProps } from './components/Dialog.js'
export { slideIndexFromScroll } from './utilities/carousel.js'
