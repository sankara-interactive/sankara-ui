// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const block = css.slice(css.indexOf('/* Dialog'), css.indexOf('/* END dialog'))

const ruleFor = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return block.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 's'))?.[0] ?? ''
}

describe('dialog stylesheet', () => {
  it('ships its rules inside @layer components, so consumer utilities still win', () => {
    expect(block).toMatch(/@layer components\s*\{/)
    const outside = block
      .replace(/@layer components\s*\{[\s\S]*\}/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    expect(outside).toBe('')
  })

  // Preflight zeroes every margin, so without this a centred modal pins itself
  // to the top-left.
  it('restores the auto margin that centres a modal', () => {
    expect(ruleFor('.sankara-dialog')).toContain('margin: auto')
  })

  it('caps the width when centred and sets one when docked', () => {
    expect(ruleFor('.sankara-dialog-sm')).toContain('max-inline-size: 24rem')
    expect(ruleFor('.sankara-dialog-md')).toContain('max-inline-size: 32rem')
    expect(ruleFor('.sankara-dialog-lg')).toContain('max-inline-size: 48rem')

    const docked = ruleFor('.sankara-dialog-end.sankara-dialog-sm')
    expect(docked).toContain('inline-size: min(20rem, 85vw)')
    // Without this the centred cap would still apply and fight the drawer width.
    expect(docked).toContain('max-inline-size: none')
  })

  it('gives the docked drawer full height and its own scroll', () => {
    const end = ruleFor('.sankara-dialog-end')
    expect(end).toContain('margin-inline: auto 0')
    expect(end).toContain('block-size: 100dvh')
    expect(end).toContain('overflow-y: auto')
  })
})
