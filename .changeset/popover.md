---
'@sankara-ui/core': minor
---

Add `Popover` — a trigger plus an anchored panel on the native Popover API.

Light dismiss, `Escape`, the top layer and one-open-at-a-time come from
`popover="auto"`; positioning is CSS anchor positioning, degrading to a
full-bleed bottom sheet where it is unsupported. The component adds no wrapper
element and no ARIA roles, and ships a `popover-open:` Tailwind variant for
expressing the open state on the trigger.
