import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import CreditTracker from '../src/components/CreditTracker'

const noop = () => {}

const lapatoSales = [
  { id: 'aug10-paid', customer_name: 'Lapato', crates: 20, singles: 0, amount: 235000, payment_status: 'Paid', date: '2026-08-10', paid_at: '2026-08-21' },
  { id: 'aug31-credit', customer_name: 'Lapato', crates: 15, singles: 0, amount: 126000, payment_status: 'Credit', date: '2026-08-31' },
]
const lapatoPayments = [{ sale_id: 'aug10-paid', amount: 140000 }]

describe('REGRESSION: "Paid in full" must never re-touch an already-Paid sale', () => {
  it('does not call onMarkPaid on the already-Paid sale, only the genuine open Credit one', async () => {
    const onMarkPaid = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <CreditTracker sales={lapatoSales} payments={lapatoPayments} onMarkPaid={onMarkPaid} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    const fullBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Paid in full')
    await act(async () => { fireEvent.click(fullBtn) })

    await waitFor(() => expect(onMarkPaid).toHaveBeenCalled())
    // Must be called exactly once - for aug31-credit only, never aug10-paid
    expect(onMarkPaid).toHaveBeenCalledTimes(1)
    expect(onMarkPaid).toHaveBeenCalledWith('aug31-credit')
    expect(onMarkPaid).not.toHaveBeenCalledWith('aug10-paid')
  })
})

describe('REGRESSION: a Paid sale never shows a false red balance in the per-sale breakdown', () => {
  it('the already-Paid sale with a raw arithmetic gap shows its full amount as paid, not a leftover red balance', () => {
    const { container } = render(
      <CreditTracker sales={lapatoSales} payments={lapatoPayments} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )
    // The per-sale breakdown only renders once the debtor row is expanded -
    // clicking the button with their exact name toggles expandedCustomer.
    const nameBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Lapato')
    act(() => { fireEvent.click(nameBtn) })
    expect(container.textContent).not.toContain('95,000')
  })
})
