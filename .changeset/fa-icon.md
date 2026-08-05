---
'@sankara-ui/core': minor
---

New `FaIcon`: webfont FontAwesome icon addressed by class-name string, for
icon names that only exist at runtime — CMS fields where editors type `fa-*`
names. Emits the `<i>` element a FontAwesome kit styles (the consumer loads
the kit); a bare glyph name gets `fa-solid` prepended, a non-string or empty
value renders nothing. No FontAwesome imports, so it exports from the main
entry with no peer requirements. `Icon` (`@sankara-ui/core/icon`) remains the
SVG path for code-authored icons.
