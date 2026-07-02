import { describe, it, expect } from 'vitest'
import { wouldExceedStock, calcInStockEggs } from '../lib/calculations.js'

describe('wouldExceedStock — blocks selling more than what is actually in stock', () => {

  it('REGRESSION: blocks a sale when stock is exactly 0 — the reported bug', () => {
    // "a user is able to sell eggs while the count of eggs is 0, that should
    // not happen" — this is the exact scenario reported.
    expect(wouldExceedStock(90, 0)).toBe(true)
  })

  it('blocks a sale that exceeds available stock, even if stock is not zero', () => {
    expect(wouldExceedStock(100, 50)).toBe(true)
  })

  it('allows a sale that is exactly equal to available stock', () => {
    expect(wouldExceedStock(50, 50)).toBe(false)
  })

  it('allows a sale that is less than available stock', () => {
    expect(wouldExceedStock(30, 50)).toBe(false)
  })

  it('a zero-quantity sale never triggers the guard (nothing to oversell)', () => {
    expect(wouldExceedStock(0, 0)).toBe(false)
    expect(wouldExceedStock(0, 500)).toBe(false)
  })

  it('works correctly against calcInStockEggs\' real output, not just raw numbers', () => {
    const collections = [{ crates: 10, singles: 0 }] // 300 eggs collected
    const sales = [{ crates: 8, singles: 0 }]         // 240 eggs already sold
    const inStock = calcInStockEggs(collections, sales) // 60 eggs left
    expect(inStock).toBe(60)

    expect(wouldExceedStock(60, inStock)).toBe(false) // sell exactly what's left: OK
    expect(wouldExceedStock(61, inStock)).toBe(true)  // sell one more egg than exists: blocked
  })

  it('REGRESSION: fresh wipe scenario — no collections logged yet, any sale is blocked', () => {
    const inStock = calcInStockEggs([], [])
    expect(inStock).toBe(0)
    expect(wouldExceedStock(1, inStock)).toBe(true)
  })
})
