import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import CreditTracker from '../src/components/CreditTracker'

const noop = () => {}

// One debtor, one open Credit sale for ₦120,000, nothing paid yet.
const sales = [
  { id: 'sale-1', customer_name: 'Wash N fold', crates: 20, singles: 0, amount: 120000, payment_status: 'Credit', date: '2026-08-18' },
]

function openPartPay(container) {
  const partPayBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Part pay')
  act(() => { fireEvent.click(partPayBtn) })
}

function getAmountInput(container) {
  return container.querySelector('input[placeholder="0"]')
}

function clickRecordPayment(container) {
  const recordBtn = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Record payment'))
  fireEvent.click(recordBtn)
}

describe('REGRESSION: Part Pay submits exactly the amount actually typed', () => {
  it('typing 72000 and submitting sends exactly {amount: 72000} to onAddPayment', async () => {
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const { container } = render(
      <CreditTracker sales={sales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '72000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalled())
    expect(onAddPayment.mock.calls[0][0].amount).toBe(72000)
    expect(onAddPayment.mock.calls[0][0].sale_id).toBe('sale-1')
  })

  it('REGRESSION: opening Part Pay, typing an amount, cancelling without submitting, then reopening and typing a NEW amount — only the new amount is ever submitted', async () => {
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const { container } = render(
      <CreditTracker sales={sales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    // First attempt: open, type 12000, cancel WITHOUT submitting
    openPartPay(container)
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '12000' } }) })
    const cancelBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Cancel')
    act(() => { fireEvent.click(cancelBtn) })

    // Second attempt: reopen, type 72000, submit for real
    openPartPay(container)
    // The field must show blank (not the leftover "12000") the moment Part Pay reopens
    expect(getAmountInput(container).value).toBe('')
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '72000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalled())
    // The only call ever made must carry 72000 — never 12000, never both
    expect(onAddPayment).toHaveBeenCalledTimes(1)
    expect(onAddPayment.mock.calls[0][0].amount).toBe(72000)
  })

  it('the amount field is blank the very first time Part Pay is opened (no leftover from a totally separate render)', () => {
    const { container } = render(
      <CreditTracker sales={sales} payments={[]} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )
    openPartPay(container)
    expect(getAmountInput(container).value).toBe('')
  })
})

describe('REGRESSION: Part Pay correctly splits a payment across MULTIPLE open sales', () => {
  // Structurally matches a real multi-sale debtor: two open Credit sales,
  // oldest first, neither one alone covering the payment amount typed.
  const multiSales = [
    { id: 'sale-a', customer_name: 'Lapato', crates: 20, singles: 0, amount: 112000, payment_status: 'Credit', date: '2026-08-05' },
    { id: 'sale-b', customer_name: 'Lapato', crates: 15, singles: 0, amount: 100000, payment_status: 'Credit', date: '2026-08-07' },
  ]

  it('a payment smaller than the oldest sale applies entirely to that one sale, in a single call', async () => {
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const { container } = render(
      <CreditTracker sales={multiSales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '50000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalled())
    expect(onAddPayment).toHaveBeenCalledTimes(1)
    expect(onAddPayment.mock.calls[0][0].sale_id).toBe('sale-a') // the OLDER sale, correctly
    expect(onAddPayment.mock.calls[0][0].amount).toBe(50000)
  })

  it('REGRESSION: a payment larger than the oldest sale correctly splits across BOTH sales, summing to exactly what was typed', async () => {
    const onAddPayment = vi.fn().mockResolvedValue({ error: null })
    const { container } = render(
      <CreditTracker sales={multiSales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    // 150000 - more than sale-a's 112000, so it must spill into sale-b too
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '150000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2))
    const calls = onAddPayment.mock.calls.map(c => c[0])
    const totalApplied = calls.reduce((s, c) => s + c.amount, 0)

    expect(totalApplied).toBe(150000) // must equal exactly what was typed, split or not
    expect(calls.find(c => c.sale_id === 'sale-a').amount).toBe(112000) // fully covers the older sale first
    expect(calls.find(c => c.sale_id === 'sale-b').amount).toBe(38000)  // remainder goes to the newer one
  })

  it('REGRESSION: if a middle insert in a split payment fails, the loop stops immediately and never touches the sale after it', async () => {
    // Three open sales this time. sale-a's insert succeeds, sale-b's FAILS.
    // A correct implementation must stop right there — sale-c must never be
    // called at all, and only sale-a's amount should count as genuinely saved.
    const threeSales = [
      ...multiSales,
      { id: 'sale-c', customer_name: 'Lapato', crates: 5, singles: 0, amount: 50000, payment_status: 'Credit', date: '2026-08-10' },
    ]

    const attempts = []
    const onAddPayment = vi.fn(async (data) => {
      attempts.push(data)
      if (attempts.length === 1) return { error: null }                          // sale-a: succeeds
      return { error: { message: 'network error' } }                             // sale-b: fails
    })

    const { container } = render(
      <CreditTracker sales={threeSales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    // Enough to fully cover sale-a (112000) + spill into sale-b + sale-c if
    // the (broken) loop kept going after the failure.
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '250000' } }) })
    await act(async () => { clickRecordPayment(container) })

    // Give any incorrect extra calls a chance to happen before asserting.
    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2))
    await new Promise(r => setTimeout(r, 50))

    expect(onAddPayment).toHaveBeenCalledTimes(2) // never reaches sale-c
    expect(attempts[0].sale_id).toBe('sale-a')
    expect(attempts[0].amount).toBe(112000)
    expect(attempts[1].sale_id).toBe('sale-b')
    // attempts[1] is the one our mock made fail — by construction, that
    // amount was never actually persisted, so the true saved total is only
    // attempts[0].amount (112000), not the full 250000 typed.
  })
})
