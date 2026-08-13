---
'@sankara-ui/core': patch
---

Narrow the documented `@source` path to `dist/components`. Pointed at the
package root it also scans `README.md`, so Tailwind emitted ~2 KB of utilities
for class names that appear only in the documentation. Since 0.9.0 the
directive serves `Icon` alone — every other component takes its defaults from
`styles.css`.
