---
'@sankara-ui/core': minor
---

Add `Heading`, which splits a heading's semantic level from its visual level:
`<Heading level={3} visual={4}>` renders `<h3 class="h4">`. Ships `font-size`
and `line-height` defaults for `.h1`-`.h4` behind four new tokens, on the
classes only — never the bare `h1`-`h6` tags — so installing it restyles no
heading you wrote yourself.
