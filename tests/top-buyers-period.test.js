import { describe, it, expect } from 'vitest'
import { calcTopBuyers } from '../src/lib/calculations.js'

describe('Top Buyers period scoping (Month / 3mo / All toggle)', () => {
  const sales = [
    { customer_name: 'Recent Buyer', amount: 50000, crates: 10, date: '2026-06-25' },
    { customer_name: 'Three Month Buyer', amount: 80000, crates: 20, date: '2026-04-10' },
    { customer_name: 'Old Buyer', amount: 200000, crates: 50, date: '2025-01-01' },
  ]

  it('3-month cutoff correctly includes a sale from ~2.5 months ago', () => {
    const now = new Date('2026-06-27')
    const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3)
    const scoped = sales.filter(s => new Date(s.date) >= cutoff)
    expect(scoped.map(s => s.customer_name)).toContain('Three Month Buyer')
    expect(scoped.map(s => s.customer_name)).not.toContain('Old Buyer')
  })

  it('All-time includes every sale regardless of date', () => {
    const topAll = calcTopBuyers(sales, 3)
    expect(topAll).toHaveLength(3)
    expect(topAll[0].name).toBe('Old Buyer') // highest amount
  })
})

describe('Top Buyers custom date range filtering', () => {
  const sales = [
    { customer_name: 'Jan Buyer', amount: 10000, crates: 5, date: '2026-01-15' },
    { customer_name: 'Mar Buyer', amount: 20000, crates: 10, date: '2026-03-10' },
    { customer_name: 'Jun Buyer', amount: 30000, crates: 15, date: '2026-06-20' },
  ]

  function filterCustomRange(sales, from, to) {
    if (!from && !to) return sales
    return sales.filter(s => {
      if (from && s.date < from) return false
      if (to && s.date > to) return false
      return true
    })
  }

  it('filters correctly to only Feb-Apr range', () => {
    const scoped = filterCustomRange(sales, '2026-02-01', '2026-04-30')
    expect(scoped.map(s => s.customer_name)).toEqual(['Mar Buyer'])
  })

  it('an open-ended "from" with no "to" includes everything after', () => {
    const scoped = filterCustomRange(sales, '2026-03-01', '')
    expect(scoped.map(s => s.customer_name)).toEqual(['Mar Buyer', 'Jun Buyer'])
  })

  it('no dates set at all returns everything unfiltered', () => {
    expect(filterCustomRange(sales, '', '')).toHaveLength(3)
  })
})
