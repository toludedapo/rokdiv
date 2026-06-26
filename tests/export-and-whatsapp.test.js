import { describe, it, expect } from 'vitest'
import {
  normalizeWhatsApp, buildWaLink,
  buildSalesCSVRows, buildCollectionsCSVRows,
} from '../src/lib/calculations.js'

// ════════════════════════════════════════════════════════════════════════
// WHATSAPP NUMBER NORMALIZATION
// ════════════════════════════════════════════════════════════════════════
describe('normalizeWhatsApp', () => {
  it('returns null for empty input', () => {
    expect(normalizeWhatsApp('')).toBeNull()
    expect(normalizeWhatsApp(null)).toBeNull()
  })

  it('REGRESSION: leaves an already-international number unchanged', () => {
    expect(normalizeWhatsApp('2348012345678')).toBe('2348012345678')
  })

  it('REGRESSION: converts a leading-zero 11-digit Nigerian number', () => {
    expect(normalizeWhatsApp('08012345678')).toBe('2348012345678')
  })

  it('converts a bare 10-digit number by prefixing 234', () => {
    expect(normalizeWhatsApp('8012345678')).toBe('2348012345678')
  })

  it('strips formatting characters (dashes, spaces, parens) before normalizing', () => {
    expect(normalizeWhatsApp('080-1234-5678')).toBe('2348012345678')
    expect(normalizeWhatsApp('(080) 1234 5678')).toBe('2348012345678')
  })

  it('returns digits as-is when the length does not match any known pattern (defensive fallback)', () => {
    expect(normalizeWhatsApp('123')).toBe('123')
  })
})

describe('buildWaLink', () => {
  it('REGRESSION: builds a correct wa.me link from a saved customer number', () => {
    const link = buildWaLink('08012345678')
    expect(link).toBe('https://wa.me/2348012345678')
  })

  it('returns null when the number is missing (no Chat button should render)', () => {
    expect(buildWaLink(null)).toBeNull()
    expect(buildWaLink('')).toBeNull()
  })

  it('REGRESSION: includes a correctly URL-encoded reminder message (Credit tab "Remind" button)', () => {
    const link = buildWaLink('08012345678', 'Hello Mrs Coo, you owe ₦40,000')
    expect(link).toContain('https://wa.me/2348012345678?text=')
    expect(link).toContain(encodeURIComponent('Hello Mrs Coo, you owe ₦40,000'))
  })

  it('does not add a ?text= param when no message is provided', () => {
    const link = buildWaLink('08012345678')
    expect(link).not.toContain('?text=')
  })
})

// ════════════════════════════════════════════════════════════════════════
// SALES CSV EXPORT — the "Amount Paid" / "Balance" columns added this session
// ════════════════════════════════════════════════════════════════════════
describe('buildSalesCSVRows', () => {
  it('REGRESSION: a fully-Paid sale shows Amount Paid = full amount, Balance = 0', () => {
    const sales = [{ id: '1', date: '2026-06-17', customer_name: 'Lapato', crates: 30, singles: 0, amount: 120000, payment_status: 'Paid' }]
    const rows = buildSalesCSVRows(sales, [])
    expect(rows[0]['Amount Paid (₦)']).toBe(120000)
    expect(rows[0]['Balance (₦)']).toBe(0)
  })

  it('REGRESSION: matches the exact Mrs Coo partial-payment CSV row from this session', () => {
    const sales = [{ id: 'mc1', date: '2026-06-17', customer_name: 'Mrs Coo', crates: 20, singles: 0, amount: 80000, payment_status: 'Credit' }]
    const payments = [{ sale_id: 'mc1', amount: 40000 }]
    const rows = buildSalesCSVRows(sales, payments)
    expect(rows[0]['Amount Paid (₦)']).toBe(40000)
    expect(rows[0]['Balance (₦)']).toBe(40000)
    expect(rows[0]['Payment Status']).toBe('Credit')
  })

  it('an unpaid credit sale with zero payments shows full balance outstanding', () => {
    const sales = [{ id: '1', date: '2026-06-17', customer_name: 'Keji', crates: 10, singles: 0, amount: 40000, payment_status: 'Credit' }]
    const rows = buildSalesCSVRows(sales, [])
    expect(rows[0]['Amount Paid (₦)']).toBe(0)
    expect(rows[0]['Balance (₦)']).toBe(40000)
  })

  it('includes crate loan tracking fields in the export', () => {
    const sales = [{ id: '1', date: '2026-06-17', customer_name: 'Mrs Coo', crates: 20, singles: 0, amount: 80000, payment_status: 'Credit', crates_loaned: 20, crates_returned: 3 }]
    const rows = buildSalesCSVRows(sales, [])
    expect(rows[0]['Crates Loaned']).toBe(20)
    expect(rows[0]['Crates Returned']).toBe(3)
  })

  it('calculates Total Eggs correctly from crates and singles', () => {
    const sales = [{ id: '1', date: '2026-06-17', customer_name: 'Test', crates: 3, singles: 5, amount: 1000, payment_status: 'Paid' }]
    const rows = buildSalesCSVRows(sales, [])
    expect(rows[0]['Total Eggs']).toBe(95)
  })

  it('handles an empty sales array without crashing', () => {
    expect(buildSalesCSVRows([], [])).toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════
// COLLECTIONS CSV EXPORT
// ════════════════════════════════════════════════════════════════════════
describe('buildCollectionsCSVRows', () => {
  it('builds correct rows with calculated Total Eggs', () => {
    const collections = [{ date: '2026-06-17', crates: 80, singles: 0, notes: 'morning' }]
    const rows = buildCollectionsCSVRows(collections)
    expect(rows[0]['Total Eggs']).toBe(2400)
    expect(rows[0]['Notes']).toBe('morning')
  })

  it('defaults Notes to empty string when not provided', () => {
    const collections = [{ date: '2026-06-17', crates: 10, singles: 0 }]
    const rows = buildCollectionsCSVRows(collections)
    expect(rows[0]['Notes']).toBe('')
  })

  it('handles an empty collections array without crashing', () => {
    expect(buildCollectionsCSVRows([])).toEqual([])
  })
})
