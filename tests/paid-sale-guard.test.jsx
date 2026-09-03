import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import CreditTracker from '../src/components/CreditTracker'

const noop = () => {}

function openPartPay(container) {
  const btn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Part pay')
  act(() => { fireEvent.click(btn) })
}
function getAmountInput(container) {
  return container.querySelector('input[placeholder="0"]')
}
function clickRecordPayment(container) {
  const btn = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Record payment'))
  fireEvent.click(btn)
}

describe('REGRESSION: a Paid sale must never receive additional Part Pay money', () => {
  // Reconstructs Lapato's real scenario: an older sale already marked Paid,
  // with a raw payment-sum gap between its face amount and recorded
  // payments (235000 amount, only 140000 recorded — a real historical data
  // quirk, not something Part Pay should ever try to "fill in"), plus the
  // genuine open Credit sale that a payment should actually go to.
  const lapatoSales = [
    { id: 'aug10-paid', customer_name: 'Lapato', crates: 20, singles: 0, amount: 235000, payment_status: 'Paid', date: '2026-08-10', paid_at: '2026-08-21' },
    { id: 'aug31-credit', customer_name: 'Lapato', crates: 15, singles: 0, amount: 126000, payment_status: 'Credit', date: '2026-08-31' },
  ]
  const lapatoPayments = [
    { sale_id: 'aug10-paid', amount: 140000 },
  ]

  it('REGRESSION: 64000 typed correctly lands on the real open Credit sale, not the older Paid one', async () => {
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const { container } = render(
      <CreditTracker sales={lapatoSales} payments={lapatoPayments} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '64000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalled())
    expect(onAddPayment).toHaveBeenCalledTimes(1)
    expect(onAddPayment.mock.calls[0][0].sale_id).toBe('aug31-credit') // NOT aug10-paid
    expect(onAddPayment.mock.calls[0][0].amount).toBe(64000)
  })

  it('a Paid sale with a real payment gap is completely skipped, even when it is the ONLY sale', async () => {
    // If every one of a debtor's sales is marked Paid (Egg roll's exact
    // situation before her data gets corrected), Part Pay must find nothing
    // to apply to at all — not silently dump money on a Paid sale.
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const onlyPaidSale = [
      { id: 'only-paid', customer_name: 'Egg roll', crates: 2, singles: 0, amount: 12000, payment_status: 'Paid', date: '2026-07-24', paid_at: '2026-07-25' },
    ]
    const { container } = render(
      <CreditTracker sales={onlyPaidSale} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    // A debtor whose only sale is Paid shouldn't even show a Part Pay
    // button in the Outstanding list - this itself is worth confirming.
    const partPayBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Part pay')
    expect(partPayBtn).toBeUndefined()
  })
})
