---
'@sankara-ui/core': minor
---

Close the three findings from the template's end-to-end integration.

- `ButtonProps` declares `popoverTarget` and `popoverTargetAction`. Using a
  `Button` as a `Popover` trigger already worked, but only because Popover's
  `cloneElement` injection landed in Button's rest-prop spread — passing either
  attribute directly was a type error, and any future prop filtering would have
  silently stopped the popover opening. The pairing is now part of the API.
- The anchored `.sankara-popover` panel gets `max-inline-size: calc(100dvw - 2rem)`.
  `width: max-content` ran the panel past the viewport edge on narrow screens;
  `position-try-fallbacks` flips a panel but cannot shrink one wider than the
  screen. `dvw` rather than `vw` so the classic scrollbar is not counted.
- README documents `StoryblokServerRichText wrapper={false}`. The renderer's
  default wrapper `<div>` breaks `RichText`'s direct-children contract, so
  content renders with no spacing at all and no error.
