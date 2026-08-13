// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// D9: a package default emitted as a Tailwind utility in JSX compiles into
// @layer utilities -- the consumer's own layer -- where `cn` (a plain join, not
// tailwind-merge) leaves both classes in the attribute and Tailwind's canonical
// sort picks the winner. Verified against a real 4.3.3 build: the package's
// gap-6 beats a consumer's gap-2 but loses to gap-8, and inline-flex and
// shrink-0 beat flex and shrink. Half the overrides silently fail, so every
// default belongs in tokens.css under @layer components instead.
const dir = new URL('.', import.meta.url)

// group      -- Disclosure's documented hook for a consumer's own group-open:
//               indicator; a marker class, it declares nothing itself.
// m-auto     -- Dialog, restoring the UA centering preflight zeroes. Documented
//               in place.
// h1..h6     -- Heading's semantic classes, not utilities.
const ALLOWED = new Set(['group', 'm-auto'])
const isAllowed = (token: string) =>
  token.startsWith('sankara-') || /^h[1-6]$/.test(token) || ALLOWED.has(token)

// Icon   -- ships from the ./icon subpath, where a consumer may never have
//           imported styles.css; its two utilities stay inline on purpose.
// Dialog -- the same defect, unfixed: its size and placement utilities come
//           from a prop-keyed map (SIZES), so closing it means a semantic class
//           per size/placement pair, which is a design decision the form spec's
//           follow-up did not cover. Tracked, not waived.
const EXCLUDED = new Set(['Icon.tsx', 'Dialog.tsx'])
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

// Only quoted literals: a template literal or an identifier is a runtime value
// (FaIcon's fa-* name, a consumer's className) and not ours to police. The
// operand of a comparison is a prop value rather than a class -- Field's
// `layout === 'inline' && 'sankara-field-inline'` has one of each.
const literalClasses = (expression: string) =>
  [...expression.replace(/[=!]==?\s*['"][^'"]*['"]/g, '').matchAll(/'([^']*)'|"([^"]*)"/g)]
    .map(m => m[1] ?? m[2] ?? '')
    .flatMap(literal => literal.split(/\s+/))
    .filter(Boolean)

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
