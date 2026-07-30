import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '')).toBe('a')
  })

  it('puts the consumer class last so it wins', () => {
    expect(cn('rounded-card', 'rounded-none')).toBe('rounded-card rounded-none')
  })
})
