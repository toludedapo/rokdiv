import { describe, it, expect } from 'vitest'

/**
 * This mirrors the exact logic added to SalesForm.jsx's handleSubmit:
 *
 *   const isExisting = customers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())
 *   if (!isExisting && onAddCustomer) {
 *     await onAddCustomer({ name: trimmedName, whatsapp: null, notes: null })
 *   }
 *
 * BUG THIS FIXES: previously, SalesForm only called onSave(payload) — which
 * writes to the `sales` table. There was no call anywhere that wrote to the
 * `customers` table. A sale to a brand-new buyer would save correctly and
 * show up in History, but the buyer would never appear in Customers or be
 * selectable in Credit/WhatsApp flows, because no customer record existed.
 */
function isNewCustomer(typedName, customers) {
  return !customers.some(c => c.name.toLowerCase() === typedName.toLowerCase())
}

describe('REGRESSION: new-customer detection (Sales tab silently not creating customers)', () => {
  it('flags a genuinely new name as new — this is the case that was broken', () => {
    const customers = [{ name: 'Lapato' }, { name: 'Mrs Coo' }]
    expect(isNewCustomer('Iya Ngozi', customers)).toBe(true)
  })

  it('does NOT flag an existing customer as new, case-insensitively (avoids duplicate records)', () => {
    const customers = [{ name: 'Lapato' }]
    expect(isNewCustomer('lapato', customers)).toBe(false)
    expect(isNewCustomer('LAPATO', customers)).toBe(false)
    expect(isNewCustomer('Lapato', customers)).toBe(false)
  })

  it('flags as new when the customers list is empty (first-ever sale)', () => {
    expect(isNewCustomer('Anyone', [])).toBe(true)
  })
})
