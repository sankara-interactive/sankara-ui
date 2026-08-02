---
'@sankara-ui/core': patch
---

Ship the `Dialog` and `Disclosure` styles inside `@layer components`.

Both were unlayered, and an unlayered rule beats every layered rule regardless
of specificity — including Tailwind's own utilities in `@layer utilities`. A
consumer's `opacity-*` or `translate-*` class on a `Dialog`, or the equivalent
on a `Disclosure`, silently lost to the package's own declarations. `Popover`
already shipped layered; this brings the other two in line, and a test now
fails if any component rule is added outside a layer.
