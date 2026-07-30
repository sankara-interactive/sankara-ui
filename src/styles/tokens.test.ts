import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOKENS } from './tokens.js'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

describe('token contract', () => {
  it('declares a default for every documented token', () => {
    const missing = TOKENS.filter(token => !css.includes(`${token}:`))
    expect(missing).toEqual([])
  })

  it('declares the defaults inside an @theme block', () => {
    expect(css).toMatch(/@theme\s*\{/)
  })
})
