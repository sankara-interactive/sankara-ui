// @vitest-environment node
import postcss, { type Root, type Rule } from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { describe, expect, it } from 'vitest'
import { DEPRECATED_TOKENS } from './tokens.js'

// Compiles the package the way a consumer does -- package first, the
// consumer's own @theme after it -- and reads the emitted :root variables.
// tokens.test.ts only greps the source; this checks what Tailwind actually
// keeps after pruning unused theme variables. See the token contract spec, D2.
const entry = new URL('./tokens.css', import.meta.url).pathname

const compile = async (consumerTheme: string, candidates: string[]) =>
  (
    await postcss([tailwind({ optimize: false })]).process(
      `@import "tailwindcss" source(none);\n@import "${entry}";\n` +
        `@theme {\n${consumerTheme}\n}\n@source inline("${candidates.join(' ')}");\n`,
      { from: entry }
    )
  ).root

function rootVars(root: Root) {
  const vars = new Map<string, string>()
  root.walkDecls(/^--/, decl => {
    if ((decl.parent as Rule | undefined)?.selector?.includes(':root')) vars.set(decl.prop, decl.value)
  })
  return vars
}

// Follows var(--x) references to a literal, the way the browser would at :root.
function resolve(vars: Map<string, string>, name: string): string | undefined {
  let value = vars.get(name)
  for (let hops = 0; value && hops < 10; hops += 1) {
    const ref = value.match(/^var\((--[\w-]+)\)$/)?.[1]
    if (!ref) return value
    value = vars.get(ref)
  }
  return value
}

const OVERRIDE = '#123456'

describe('deprecated token aliases in a compiled consumer build', () => {
  it.each(Object.entries(DEPRECATED_TOKENS))(
    'an override of %s still drives %s',
    async (old, next) => {
      const utility = `bg-${next.replace('--color-', '')}`
      const vars = rootVars(await compile(`${old}: ${OVERRIDE};`, [utility]))
      expect(resolve(vars, next)).toBe(OVERRIDE)
    }
  )

  it.each(Object.entries(DEPRECATED_TOKENS))(
    'an override of the replacement %s → %s wins outright',
    async (_old, next) => {
      const utility = `bg-${next.replace('--color-', '')}`
      const vars = rootVars(await compile(`${next}: ${OVERRIDE};`, [utility]))
      expect(resolve(vars, next)).toBe(OVERRIDE)
    }
  )

  it('still generates the old utilities consumers already use', async () => {
    const root = await compile('', ['text-muted', 'text-primary-contrast', 'bg-surface'])
    const css = root.toString()
    expect(css).toMatch(/\.text-muted \{[^}]*var\(--color-muted\)/)
    expect(css).toMatch(/\.text-primary-contrast \{[^}]*var\(--color-primary-contrast\)/)
    expect(css).toMatch(/\.bg-surface \{[^}]*var\(--color-surface\)/)
  })

  it('leaves an unthemed package looking as it did in 0.9.0', async () => {
    const vars = rootVars(await compile('', ['bg-card', 'bg-background', 'text-foreground']))
    expect(resolve(vars, '--color-card')).toBe('oklch(1 0 0)')
    expect(resolve(vars, '--color-background')).toBe('oklch(1 0 0)')
    expect(resolve(vars, '--color-foreground')).toBe('oklch(0.25 0.02 275)')
  })
})
