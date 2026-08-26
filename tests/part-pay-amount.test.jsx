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
