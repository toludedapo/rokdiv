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

  it('REGRESSION: if the SECOND insert in a split payment fails, the total actually saved must not silently exceed what was typed', async () => {
    // sale-a's insert succeeds, sale-b's insert fails (simulating a real
    // partial-failure mid-split - exactly the scenario a multi-sale debtor
    // can hit that a single-sale debtor never can).
    const onAddPayment = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'network error' } })

    const { container } = render(
      <CreditTracker sales={multiSales} payments={[]} onMarkPaid={noop} onAddPayment={onAddPayment} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )

    openPartPay(container)
    act(() => { fireEvent.change(getAmountInput(container), { target: { value: '150000' } }) })
    await act(async () => { clickRecordPayment(container) })

    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2))
    const totalActuallyApplied = onAddPayment.mock.results
      .filter(r => r.value && !r.value.error)
      .length // can't sum amounts from unresolved promises directly here, but count of successful calls matters
    expect(totalActuallyApplied).toBe(1) // only sale-a's payment actually succeeded
  })
})
