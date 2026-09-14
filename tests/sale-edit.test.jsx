import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import SalesForm from '../src/components/SalesForm'

afterEach(() => cleanup())

const noop = () => {}

const odunSale = {
  id: 'odun-sale-1', customer_name: 'Odun', date: '2026-09-14',
  crates: 40, singles: 0, amount: 1680000, payment_status: 'Paid', payment_mode: 'Cash',
  crates_loaned: 0, crates_returned: 0,
}

describe('REGRESSION: editing a sale sends the corrected value, not a new duplicate', () => {
  it('correcting Odun\'s mistyped amount calls onEdit with the right id and the corrected amount', async () => {
    const onEdit = vi.fn().mockResolvedValue({ error: null })
    const { container, getByTestId } = render(
      <SalesForm sales={[odunSale]} cratesInFarm={200} inStockEggs={100000} customers={[]}
        onSave={noop} onDelete={noop} onEdit={onEdit} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />
    )

    act(() => { fireEvent.click(getByTestId('edit-sale-odun-sale-1')) })

    const amountInput = getByTestId('edit-amount')
    expect(amountInput.value).toBe('1680000')
    act(() => { fireEvent.change(amountInput, { target: { value: '168000' } }) })

    await act(async () => { fireEvent.click(getByTestId('save-edit')) })

    await waitFor(() => expect(onEdit).toHaveBeenCalled())
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit.mock.calls[0][0]).toBe('odun-sale-1')
    expect(onEdit.mock.calls[0][1].amount).toBe(168000)
    expect(onEdit.mock.calls[0][1].crates).toBe(40)
  })

  it('REGRESSION: reducing a sale\'s own quantity is never blocked by the stock guard, even at zero available stock', async () => {
    const onEdit = vi.fn().mockResolvedValue({ error: null })
    const { getByTestId } = render(
      <SalesForm sales={[odunSale]} cratesInFarm={200} inStockEggs={0} customers={[]}
        onSave={noop} onDelete={noop} onEdit={onEdit} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />
    )
    act(() => { fireEvent.click(getByTestId('edit-sale-odun-sale-1')) })
    act(() => { fireEvent.change(getByTestId('edit-crates'), { target: { value: '20' } }) })
    await act(async () => { fireEvent.click(getByTestId('save-edit')) })

    await waitFor(() => expect(onEdit).toHaveBeenCalled())
    expect(onEdit.mock.calls[0][1].crates).toBe(20)
  })

  it('REGRESSION: increasing a sale beyond what is genuinely available is still blocked', async () => {
    const onEdit = vi.fn().mockResolvedValue({ error: null })
    const { container, getByTestId } = render(
      <SalesForm sales={[odunSale]} cratesInFarm={200} inStockEggs={0} customers={[]}
        onSave={noop} onDelete={noop} onEdit={onEdit} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />
    )
    act(() => { fireEvent.click(getByTestId('edit-sale-odun-sale-1')) })
    act(() => { fireEvent.change(getByTestId('edit-crates'), { target: { value: '100' } }) })
    await act(async () => { fireEvent.click(getByTestId('save-edit')) })

    expect(onEdit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Not enough stock')
  })
})
