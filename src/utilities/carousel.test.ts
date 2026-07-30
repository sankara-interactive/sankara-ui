import { describe, expect, it } from 'vitest'
import { slideIndexFromScroll } from './carousel.js'

describe('slideIndexFromScroll', () => {
  it('is zero at rest', () => {
    expect(slideIndexFromScroll(0, 300, 16)).toBe(0)
  })

  it('advances once past a full slide plus gap', () => {
    expect(slideIndexFromScroll(316, 300, 16)).toBe(1)
  })

  it('rounds to the nearest slide mid-drag', () => {
    expect(slideIndexFromScroll(200, 300, 16)).toBe(1)
    expect(slideIndexFromScroll(120, 300, 16)).toBe(0)
  })

  it('never returns a negative index for elastic overscroll', () => {
    expect(slideIndexFromScroll(-40, 300, 16)).toBe(0)
  })

  it('returns zero rather than NaN before layout settles', () => {
    expect(slideIndexFromScroll(0, 0, 16)).toBe(0)
  })
})
