---
'@sankara-ui/core': minor
---

Add `RichText` — the stylesheet contract that makes CMS output readable after
Tailwind's preflight strips it, plus the wrapper component that applies it.

Restores block rhythm, heading sizes and weights, list markers and nesting, link
underlines, tables, `hr`, inline images and a `blockquote` fallback, behind six
new `--richtext-*` tokens. Ships in `@layer base` with `:where()` on the
container class only, so each rule carries the specificity of a bare element
selector: tied with preflight, and tied with your own bare `h2`. Beaten by any
class-scoped rule of yours (`.richtext h2`), by any Tailwind utility, and by
your own bare element rules — the last only because your CSS loads after ours,
so import `@sankara-ui/core/styles.css` after `tailwindcss` and before your own
base styles. Headings hyphenate for German compounds, which needs a `lang`
attribute describing the content.
