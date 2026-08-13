// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// D9: a package default emitted as a Tailwind utility in JSX compiles into
// @layer utilities -- the consumer's own layer -- where `cn` (a plain join, not
// tailwind-merge) leaves both classes in the attribute and Tailwind's canonical
// sort picks the winner. Measured against a 4.3.3 build, roughly half of all
// overrides lost, so every default belongs in tokens.css instead.
const dir = new URL('.', import.meta.url)

// A marker class for a consumer's own group-open: indicator; declares nothing.
const ALLOWED = new Set(['group'])
const isAllowed = (token: string) =>
  token.startsWith('sankara-') || /^h[1-6]$/.test(token) || ALLOWED.has(token)

// Icon ships from ./icon, where a consumer may never have imported styles.css;
// its two utilities stay inline on purpose.
const EXCLUDED = new Set(['Icon.tsx'])
const FILES = fs
  .readdirSync(dir)
  .filter(f => f.endsWith('.tsx') && !/\.(test|stories)\.tsx$/.test(f) && !EXCLUDED.has(f))

// Returns every className={...} / className="..." expression in the source,
// brace-matched so a multi-line cn(...) call is captured whole.
function classNameExpressions(source: string): string[] {
  const found: string[] = []
  for (let i = source.indexOf('className='); i !== -1; i = source.indexOf('className=', i + 1)) {
    const start = i + 'className='.length
    if (source[start] === '"') {
      found.push(source.slice(start + 1, source.indexOf('"', start + 1)))
      continue
    }
    if (source[start] !== '{') continue
    let depth = 0
    for (let j = start; j < source.length; j++) {
      if (source[j] === '{') depth++
      if (source[j] === '}' && --depth === 0) {
        found.push(source.slice(start + 1, j))
        break
      }
    }
  }
  return found
}

// Templates count too -- backticks carry `sankara-x flex` just as well. A token
// touching an interpolation is dropped whole (Heading's `h${visual}` is a class
// this test cannot know), so the marker must not be whitespace: it has to stay
// glued to its token rather than split off a bare `h`.
//
// The operand of a comparison is a prop value, not a class -- Field's
// `layout === 'inline' && 'sankara-field-inline'` has one of each.
//
// Not caught: a class list held in a module constant and passed by identifier.
// Dialog's SIZES is that shape.
const HOLE = '\u0000'

const literalClasses = (expression: string) =>
  [
    ...expression
      .replace(/[=!]==?\s*['"][^'"]*['"]/g, '')
      .matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g),
  ]
    .map(m => m[1] ?? m[2] ?? m[3] ?? '')
    .flatMap(literal => literal.replace(/\$\{[^}]*\}/g, HOLE).split(/\s+/))
    .filter(token => token && !token.includes(HOLE))

describe('components emit no inline Tailwind utilities (D9)', () => {
  for (const file of FILES) {
    it(`${file} styles only through semantic classes`, () => {
      const source = fs.readFileSync(path.join(dir.pathname, file), 'utf8')
      const offenders = classNameExpressions(source)
        .flatMap(literalClasses)
        .filter(token => !isAllowed(token))
      expect(offenders, `${file} must move these into tokens.css: ${offenders.join(' ')}`).toEqual(
        []
      )
    })
  }
})
