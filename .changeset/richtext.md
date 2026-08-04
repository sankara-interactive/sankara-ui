---
'@sankara-ui/core': minor
---

Add `RichText` — the stylesheet contract that makes CMS output readable after
Tailwind's preflight strips it, plus the wrapper component that applies it.

Restores block rhythm, heading sizes and weights, list markers and nesting, link
underlines, tables, `hr` and a `blockquote` fallback, behind six new
`--richtext-*` tokens. Ships in `@layer base` with `:where()` selectors, so every
default loses to your own rules and to any Tailwind utility. Headings hyphenate
for German compounds, which needs a `lang` attribute describing the content.
