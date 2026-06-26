import { describe, it, expect } from 'vitest'
import {
  eggsFromRecord, CRATE_SIZE,
  calcRevenue, calcRevenueForMonth, calcRevenueTrend,
  calcTotalCollectedEggs, calcTotalSoldEggs, calcTotalSoldCrates,
  calcInStockEggs, calcInStockCrates, calcInStockSingles,
  calcRunRate, calcDaysLeft, stockSignalFor, stockLabelFor,
  buildPaidBySaleMap, calcSaleBalance, calcOutstanding, calcCreditSalesCount,
  buildDebtors, calcTotalOutstandingFromDebtors, calcOverdueCount, agingDays,
  calcCratesOut, buildCratesOutCustomers,
  calcTotalExpenses, calcExpensesForMonth, calcNetProfit, calcMargin,
  calcTopBuyers, calcTopDebts, calcCollectionStreak,
} from '../src/lib/calculations.js'

// ════════════════════════════════════════════════════════════════════════
// EGG MATH
// ════════════════════════════════════════════════════════════════════════
describe('eggsFromRecord', () => {
  it('converts crates and singles to total eggs', () => {
    expect(eggsFromRecord({ crates: 2, singles: 5 })).toBe(65)
  })
  it('handles missing singles field', () => {
    expect(eggsFromRecord({ crates: 3 })).toBe(90)
  })
  it('handles loose_eggs as alias for singles', () => {
    expect(eggsFromRecord({ crates: 1, loose_eggs: 10 })).toBe(40)
  })
  it('handles zero crates with only singles', () => {
    expect(eggsFromRecord({ crates: 0, singles: 15 })).toBe(15)
  })
  it('handles completely empty record', () => {
    expect(eggsFromRecord({})).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════
// REVENUE — the exact bug class we found 3 times this session
// ════════════════════════════════════════════════════════════════════════
describe('calcRevenue', () => {
  it('REGRESSION: excludes credit sales from revenue (the recurring bug)', () => {
    const sales = [
      { amount: 120000, payment_status: 'Paid' },
      { amount: 80000, payment_status: 'Credit' },
      { amount: 60000, payment_status: 'Paid' },
    ]
    // This is exactly the Lapato/Mrs Coo/Keji scenario from this session.
    // Mrs Coo's credit sale must NOT count as revenue.
    expect(calcRevenue(sales)).toBe(180000)
  })

  it('returns 0 when all sales are credit', () => {
    const sales = [{ amount: 50000, payment_status: 'Credit' }]
    expect(calcRevenue(sales)).toBe(0)
  })

  it('returns 0 for empty sales array', () => {
    expect(calcRevenue([])).toBe(0)
  })

  it('sums multiple paid sales correctly', () => {
    const sales = [
      { amount: 100, payment_status: 'Paid' },
      { amount: 200, payment_status: 'Paid' },
      { amount: 300, payment_status: 'Paid' },
    ]
    expect(calcRevenue(sales)).toBe(600)
  })

  it('handles string amounts (Supabase sometimes returns numeric as string)', () => {
    const sales = [{ amount: '150.50', payment_status: 'Paid' }]
    expect(calcRevenue(sales)).toBe(150.5)
  })
})

describe('calcRevenueForMonth', () => {
  it('only counts sales within the specified month', () => {
    const sales = [
      { date: '2026-06-15', amount: 100, payment_status: 'Paid' },
      { date: '2026-05-20', amount: 999, payment_status: 'Paid' },
      { date: '2026-06-30', amount: 50, payment_status: 'Paid' },
    ]
    expect(calcRevenueForMonth(sales, 2026, 5)).toBe(150) // month is 0-indexed: 5 = June
  })
})

describe('calcRevenueTrend', () => {
  it('calculates positive percentage growth', () => {
    expect(calcRevenueTrend(150, 100)).toBe('50')
  })
  it('calculates negative percentage decline', () => {
    expect(calcRevenueTrend(50, 100)).toBe('-50')
  })
  it('returns null when last month revenue is zero (avoid divide by zero)', () => {
    expect(calcRevenueTrend(100, 0)).toBeNull()
  })
  it('returns null when last month revenue is null', () => {
    expect(calcRevenueTrend(100, null)).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// STOCK / INVENTORY
// ════════════════════════════════════════════════════════════════════════
describe('calcInStockEggs', () => {
  it('REGRESSION: never goes negative when oversold (clamped at 0)', () => {
    const collections = [{ crates: 10, singles: 0 }]
    const sales = [{ crates: 50, singles: 0 }] // sold more than collected
    expect(calcInStockEggs(collections, sales)).toBe(0)
  })

  it('correctly subtracts sold from collected', () => {
    const collections = [{ crates: 100, singles: 0 }]
    const sales = [{ crates: 30, singles: 0 }]
    expect(calcInStockEggs(collections, sales)).toBe(70 * CRATE_SIZE)
  })

  it('handles multiple collection and sale entries', () => {
    const collections = [{ crates: 50, singles: 5 }, { crates: 30, singles: 10 }]
    const sales = [{ crates: 20, singles: 0 }, { crates: 10, singles: 5 }]
    // collected: 80*30+15 = 2415, sold: 30*30+5 = 905, remaining: 1510
    expect(calcInStockEggs(collections, sales)).toBe(1510)
  })
})

describe('calcInStockCrates / calcInStockSingles', () => {
  it('splits eggs into crates and remainder singles correctly', () => {
    const eggs = 95 // 3 crates + 5 singles
    expect(calcInStockCrates(eggs)).toBe(3)
    expect(calcInStockSingles(eggs)).toBe(5)
  })
  it('handles exact crate multiples with zero singles', () => {
    expect(calcInStockCrates(90)).toBe(3)
    expect(calcInStockSingles(90)).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════
// DAYS LEFT / STOCK SIGNAL — drives the hero card color on Home
// ════════════════════════════════════════════════════════════════════════
describe('calcDaysLeft', () => {
  it('returns null when run rate is zero', () => {
    expect(calcDaysLeft(1000, 0)).toBeNull()
  })
  it('returns null when run rate is null', () => {
    expect(calcDaysLeft(1000, null)).toBeNull()
  })
  it('returns null when stock is zero or negative', () => {
    expect(calcDaysLeft(0, 100)).toBeNull()
  })
  it('calculates days remaining correctly', () => {
    expect(calcDaysLeft(700, 100)).toBe(7)
  })
})

describe('stockSignalFor', () => {
  it('REGRESSION: matches the exact thresholds shown in the Home hero card', () => {
    expect(stockSignalFor(null)).toBe('gray')
    expect(stockSignalFor(25)).toBe('green')  // >= 20 = healthy
    expect(stockSignalFor(20)).toBe('green')  // boundary
    expect(stockSignalFor(15)).toBe('orange') // 10-19 = getting low
    expect(stockSignalFor(10)).toBe('orange') // boundary
    expect(stockSignalFor(5)).toBe('red')     // < 10 = critical
    expect(stockSignalFor(0)).toBe('red')
  })
})

describe('stockLabelFor', () => {
  it('returns the exact label text shown in the UI', () => {
    expect(stockLabelFor(null)).toBe('No data yet')
    expect(stockLabelFor(25)).toBe('Healthy')
    expect(stockLabelFor(15)).toBe('Getting low')
    expect(stockLabelFor(5)).toBe('Critical')
  })
})

// ════════════════════════════════════════════════════════════════════════
// OUTSTANDING / CREDIT — money owed by customers
// ════════════════════════════════════════════════════════════════════════
describe('buildPaidBySaleMap', () => {
  it('sums multiple payments against the same sale (partial payments)', () => {
    const payments = [
      { sale_id: 'a', amount: 20000 },
      { sale_id: 'a', amount: 10000 },
      { sale_id: 'b', amount: 5000 },
    ]
    const map = buildPaidBySaleMap(payments)
    expect(map.a).toBe(30000)
    expect(map.b).toBe(5000)
  })
  it('returns empty object for no payments', () => {
    expect(buildPaidBySaleMap([])).toEqual({})
  })
})

describe('calcSaleBalance', () => {
  it('treats fully-Paid sales as zero balance regardless of payment records', () => {
    const sale = { id: 'x', amount: 80000, payment_status: 'Paid' }
    expect(calcSaleBalance(sale, {})).toBe(0)
  })
  it('REGRESSION: credit sale with partial payment shows correct remaining balance', () => {
    const sale = { id: 'mrscoo1', amount: 80000, payment_status: 'Credit' }
    const paidMap = { mrscoo1: 40000 }
    expect(calcSaleBalance(sale, paidMap)).toBe(40000)
  })
  it('never goes negative when overpaid', () => {
    const sale = { id: 'x', amount: 10000, payment_status: 'Credit' }
    const paidMap = { x: 15000 }
    expect(calcSaleBalance(sale, paidMap)).toBe(0)
  })
})

describe('calcOutstanding', () => {
  it('REGRESSION: matches the exact Mrs Coo scenario from this session', () => {
    const sales = [
      { id: 'mc1', amount: 80000, payment_status: 'Credit', paid_at: null },
    ]
    const payments = [{ sale_id: 'mc1', amount: 40000 }]
    expect(calcOutstanding(sales, payments)).toBe(40000)
  })
  it('excludes credit sales that have been marked paid_at', () => {
    const sales = [
      { id: 'a', amount: 50000, payment_status: 'Credit', paid_at: '2026-06-20' },
    ]
    expect(calcOutstanding(sales, [])).toBe(0)
  })
  it('returns 0 when there are no credit sales', () => {
    const sales = [{ id: 'a', amount: 50000, payment_status: 'Paid' }]
    expect(calcOutstanding(sales, [])).toBe(0)
  })
})

describe('calcCreditSalesCount', () => {
  it('counts only unpaid credit sales for the debtor count badge', () => {
    const sales = [
      { payment_status: 'Credit', paid_at: null },
      { payment_status: 'Credit', paid_at: null },
      { payment_status: 'Credit', paid_at: '2026-06-01' }, // settled, excluded
      { payment_status: 'Paid', paid_at: '2026-06-01' },
    ]
    expect(calcCreditSalesCount(sales)).toBe(2)
  })
})

// ════════════════════════════════════════════════════════════════════════
// DEBTOR AGGREGATION — CreditTracker's core logic
// ════════════════════════════════════════════════════════════════════════
describe('buildDebtors', () => {
  it('groups multiple sales by customer name', () => {
    const sales = [
      { id: '1', customer_name: 'Mrs Coo', amount: 50000, date: '2026-06-10', payment_status: 'Credit' },
      { id: '2', customer_name: 'Mrs Coo', amount: 30000, date: '2026-06-15', payment_status: 'Credit' },
    ]
    const debtors = buildDebtors(sales, [])
    expect(debtors).toHaveLength(1)
    expect(debtors[0].name).toBe('Mrs Coo')
    expect(debtors[0].originalTotal).toBe(80000)
    expect(debtors[0].sales).toHaveLength(2)
  })

  it('tracks the oldest sale date per customer for aging', () => {
    const sales = [
      { id: '1', customer_name: 'Keji', amount: 10000, date: '2026-06-15', payment_status: 'Credit' },
      { id: '2', customer_name: 'Keji', amount: 10000, date: '2026-06-05', payment_status: 'Credit' },
    ]
    const debtors = buildDebtors(sales, [])
    expect(debtors[0].oldest).toBe('2026-06-05')
  })

  it('marks a debtor settled when fully paid', () => {
    const sales = [
      { id: '1', customer_name: 'Lapato', amount: 50000, date: '2026-06-10', payment_status: 'Credit' },
    ]
    const payments = [{ sale_id: '1', amount: 50000 }]
    const debtors = buildDebtors(sales, payments)
    expect(debtors[0].isSettled).toBe(true)
    expect(debtors[0].remaining).toBe(0)
  })

  it('marks a debtor unsettled when partially paid', () => {
    const sales = [
      { id: '1', customer_name: 'Lapato', amount: 50000, date: '2026-06-10', payment_status: 'Credit' },
    ]
    const payments = [{ sale_id: '1', amount: 20000 }]
    const debtors = buildDebtors(sales, payments)
    expect(debtors[0].isSettled).toBe(false)
    expect(debtors[0].remaining).toBe(30000)
    expect(debtors[0].totalPaid).toBe(20000)
  })

  it('sorts debtors by oldest sale first', () => {
    const sales = [
      { id: '1', customer_name: 'B', amount: 10000, date: '2026-06-20', payment_status: 'Credit' },
      { id: '2', customer_name: 'A', amount: 10000, date: '2026-06-01', payment_status: 'Credit' },
    ]
    const debtors = buildDebtors(sales, [])
    expect(debtors[0].name).toBe('A')
    expect(debtors[1].name).toBe('B')
  })
})

describe('calcOverdueCount', () => {
  it('counts debtors overdue past the threshold', () => {
    const now = new Date('2026-06-25')
    const debtors = [
      { isSettled: false, oldest: '2026-06-01' }, // 24 days, overdue
      { isSettled: false, oldest: '2026-06-20' }, // 5 days, not overdue
      { isSettled: true,  oldest: '2026-05-01' }, // settled, excluded
    ]
    expect(calcOverdueCount(debtors, now, 14)).toBe(1)
  })
})

describe('agingDays', () => {
  it('calculates whole days between two dates', () => {
    const now = new Date('2026-06-25')
    expect(agingDays('2026-06-15', now)).toBe(10)
  })
  it('returns 0 for today', () => {
    const now = new Date('2026-06-25')
    expect(agingDays('2026-06-25', now)).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════
// CRATES OUT
// ════════════════════════════════════════════════════════════════════════
describe('calcCratesOut', () => {
  it('sums outstanding loaned crates across sales', () => {
    const sales = [
      { crates_loaned: 20, crates_returned: 5 },
      { crates_loaned: 10, crates_returned: 10 }, // fully returned
      { crates_loaned: 5, crates_returned: 0 },
    ]
    expect(calcCratesOut(sales)).toBe(20) // (20-5) + (10-10) + (5-0)
  })
  it('never goes negative for a single sale (clamped)', () => {
    const sales = [{ crates_loaned: 5, crates_returned: 10 }] // shouldn't happen but defend anyway
    expect(calcCratesOut(sales)).toBe(0)
  })
})

describe('buildCratesOutCustomers', () => {
  it('REGRESSION: excludes customers with zero crates out (the Morenikeji/Alhaji Musa bug)', () => {
    const sales = [
      { customer_name: 'Morenikeji', crates_loaned: 50, crates_returned: 5 },
      { customer_name: 'Alhaji Musa', crates_loaned: 15, crates_returned: 15 }, // fully returned, should not appear
    ]
    const customers = buildCratesOutCustomers(sales)
    expect(customers).toHaveLength(1)
    expect(customers[0].name).toBe('Morenikeji')
    expect(customers[0].totalOut).toBe(45)
  })
})

// ════════════════════════════════════════════════════════════════════════
// EXPENSES / P&L
// ════════════════════════════════════════════════════════════════════════
describe('calcNetProfit / calcMargin', () => {
  it('calculates profit as revenue minus expenses', () => {
    expect(calcNetProfit(100000, 30000)).toBe(70000)
  })
  it('allows negative net profit (a loss)', () => {
    expect(calcNetProfit(10000, 30000)).toBe(-20000)
  })
  it('calculates margin percentage correctly', () => {
    expect(calcMargin(70000, 100000)).toBe('70.0')
  })
  it('returns null margin when revenue is zero (avoid divide by zero)', () => {
    expect(calcMargin(0, 0)).toBeNull()
  })
})

describe('calcExpensesForMonth', () => {
  it('only sums expenses within the given month', () => {
    const expenses = [
      { date: '2026-06-10', amount: 5000 },
      { date: '2026-05-15', amount: 9999 },
    ]
    expect(calcExpensesForMonth(expenses, 2026, 5)).toBe(5000)
  })
})

// ════════════════════════════════════════════════════════════════════════
// TOP BUYERS / TOP DEBTS — Home dashboard widgets
// ════════════════════════════════════════════════════════════════════════
describe('calcTopBuyers', () => {
  it('sorts buyers by total amount descending and limits results', () => {
    const sales = [
      { customer_name: 'Lapato', amount: 120000, crates: 30 },
      { customer_name: 'Mrs Coo', amount: 80000, crates: 20 },
      { customer_name: 'Keji', amount: 60000, crates: 15 },
      { customer_name: 'Small Buyer', amount: 5000, crates: 1 },
    ]
    const top = calcTopBuyers(sales, 3)
    expect(top).toHaveLength(3)
    expect(top[0].name).toBe('Lapato')
    expect(top[2].name).toBe('Keji')
  })

  it('aggregates multiple sales from the same buyer', () => {
    const sales = [
      { customer_name: 'Lapato', amount: 50000, crates: 10 },
      { customer_name: 'Lapato', amount: 70000, crates: 20 },
    ]
    const top = calcTopBuyers(sales)
    expect(top[0].amount).toBe(120000)
    expect(top[0].crates).toBe(30)
  })
})

describe('calcTopDebts', () => {
  it('only includes unpaid credit sales, sorted by remaining descending', () => {
    const sales = [
      { id: '1', customer_name: 'Mrs Coo', amount: 80000, payment_status: 'Credit', paid_at: null },
      { id: '2', customer_name: 'Lapato', amount: 20000, payment_status: 'Paid', paid_at: '2026-06-01' },
    ]
    const payments = [{ sale_id: '1', amount: 30000 }]
    const top = calcTopDebts(sales, payments)
    expect(top).toHaveLength(1)
    expect(top[0].name).toBe('Mrs Coo')
    expect(top[0].remaining).toBe(50000)
  })
})

// ════════════════════════════════════════════════════════════════════════
// COLLECTION STREAK
// ════════════════════════════════════════════════════════════════════════
describe('calcCollectionStreak', () => {
  it('counts consecutive days including today', () => {
    const now = new Date('2026-06-25T12:00:00')
    const collections = [
      { date: '2026-06-25' },
      { date: '2026-06-24' },
      { date: '2026-06-23' },
    ]
    expect(calcCollectionStreak(collections, now)).toBe(3)
  })

  it('breaks the streak on a missed day', () => {
    const now = new Date('2026-06-25T12:00:00')
    const collections = [
      { date: '2026-06-25' },
      { date: '2026-06-23' }, // gap on the 24th
    ]
    expect(calcCollectionStreak(collections, now)).toBe(1)
  })

  it('returns 0 for no collections', () => {
    expect(calcCollectionStreak([])).toBe(0)
  })

  it('counts streak that ended yesterday (still valid if today not yet logged)', () => {
    const now = new Date('2026-06-25T08:00:00')
    const collections = [
      { date: '2026-06-24' },
      { date: '2026-06-23' },
    ]
    expect(calcCollectionStreak(collections, now)).toBe(2)
  })
})
