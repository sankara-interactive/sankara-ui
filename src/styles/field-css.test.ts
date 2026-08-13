// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const ruleFor = (selector: string) =>
  css.match(new RegExp(`\\${selector} \\{[^}]*}`, 's'))?.[0]

describe('field stylesheet', () => {
  it('declares both new tokens in @theme', () => {
    const theme = css.match(/@theme \{[^}]*}/s)?.[0]
    expect(theme).toContain('--color-error:')
    expect(theme).toContain('--field-accent: var(--color-primary)')
  })

  it('stacks by default and reorders inline without changing DOM order', () => {
    expect(ruleFor('.sankara-field')).toContain('flex-direction: column')
    const inline = ruleFor('.sankara-field-inline')
    expect(inline).toContain('flex-direction: row')
    // The label follows the control in the DOM only visually -- order, not markup.
    expect(css).toMatch(/\.sankara-field-inline > \.sankara-field-label \{[^}]*order: 2/s)
  })

  it('gives the control a visible surface from existing globals', () => {
    const control = ruleFor('.sankara-field-control')
    expect(control).toContain('background: var(--color-surface)')
    expect(control).toContain('border: 1px solid var(--color-muted)')
    expect(control).toContain('border-radius: var(--radius-card)')
  })

  it('rings on focus-visible only, from the shared focus token', () => {
    const ring = css.match(/\.sankara-field-control:focus-visible[^{]*\{[^}]*}/s)?.[0]
    expect(ring).toContain('outline: 2px solid var(--color-focus)')
    expect(ring).toContain('outline-offset: 2px')
  })

  it('extends the focus ring to the checkbox and radio classes', () => {
    const ring = css.match(/\.sankara-field-control:focus-visible[^{]*\{[^}]*}/s)?.[0]
    expect(ring).toContain('.sankara-field-checkbox:focus-visible')
    expect(ring).toContain('.sankara-field-radio:focus-visible')
  })

  it('tints native checkbox and radio with the brand accent', () => {
    expect(css).toMatch(
      /\.sankara-field-checkbox,\s*\.sankara-field-radio \{[^}]*accent-color: var\(--field-accent\)/s
    )
  })

  it('colours the error text but never uses colour as the only cue', () => {
    expect(ruleFor('.sankara-field-error')).toContain('color: var(--color-error)')
    // No [aria-invalid] selector exists at all -- the message element is the
    // only cue, so nothing in the stylesheet recolours the control on error.
    expect(css).not.toMatch(/\[aria-invalid\]/)
  })

  it('ships the field rules inside @layer components so consumer utilities win', () => {
    const layers = css.match(/@layer components \{/g)
    expect(layers).toBeTruthy()
    const fieldIndex = css.indexOf('.sankara-field {')
    const layerStarts = [...css.matchAll(/@layer (\w+) \{/g)]
    const enclosing = layerStarts.filter(m => m.index! < fieldIndex).pop()
    expect(enclosing?.[1]).toBe('components')
  })
})
