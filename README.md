# @sankara/ui

Shared UI components for sankara:interactive projects. Next 16 + Tailwind v4.

## Install

```sh
yarn add @sankara/ui
yarn add @fortawesome/fontawesome-svg-core @fortawesome/react-fontawesome
```

`react`, `react-dom` and `tailwindcss` are expected peers — every target
project already has them.

Then in your global stylesheet — **both lines are required**:

```css
@import "tailwindcss";
@import "@sankara/ui/styles.css";
@source "../node_modules/@sankara/ui";
```

Tailwind v4 does not scan `node_modules` by default. Without the `@source`
line the components render completely unstyled, with no error.

## Theming

`@sankara/ui/styles.css` ships neutral defaults for every token. Override any
of them in your own `@theme` block, after the import:

| Token | Purpose |
| --- | --- |
| `--color-primary` | Accent — active carousel dot, emphasis |
| `--color-primary-contrast` | Foreground on `--color-primary` |
| `--color-surface` | Card and panel background |
| `--color-on-surface` | Body text on `--color-surface` |
| `--color-muted` | Secondary text, inactive controls |
| `--radius-card` | Corner radius for cards and panels |
| `--shadow-raised` | Elevation for raised surfaces |

## Icons

`Icon` takes a FontAwesome `IconDefinition`. The package deliberately ships no
icon set, so it works with the free packages, Pro, or a Kit — install
whichever one you use (the example below sources its icon from
`@fortawesome/free-solid-svg-icons`):

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Icon } from '@sankara/ui'

<Icon icon={faChevronDown} size={22} label="Mehr anzeigen" />
```

Omit `label` for decorative icons; they are then hidden from assistive tech.
`label` becomes `aria-label` plus `role="img"` — FontAwesome 7 deprecated its own
`title` prop in favour of exactly this.

## Carousel

```tsx
import { Carousel } from '@sankara/ui'

<Carousel label="Referenzen" perView={2.2}>
  {items.map(item => <Card key={item.id} {...item} />)}
</Carousel>
```

Static scroll-snap only. Autoplay, looping and synced carousels are not
included yet.
