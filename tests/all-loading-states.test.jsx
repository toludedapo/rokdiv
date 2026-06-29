import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CollectionForm from '../src/components/CollectionForm'
import SalesForm from '../src/components/SalesForm'
import ExpenseTracker from '../src/components/ExpenseTracker'
import CustomerManager from '../src/components/CustomerManager'
import HistoryLog from '../src/components/HistoryLog'
import CreditTracker from '../src/components/CreditTracker'

const noop = () => {}

// ════════════════════════════════════════════════════════════════════════
// COLLECTION FORM
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: CollectionForm loading state', () => {
  it('shows skeleton, not the real "Collection log" label, when loading=true', () => {
    const { queryByText } = render(<CollectionForm loading={true} onSave={noop} onDelete={noop} showToast={noop} />)
    expect(queryByText('Collection log')).toBeNull()
  })

  it('shows real content once loading=false', () => {
    const { queryByText } = render(<CollectionForm loading={false} collections={[]} onSave={noop} onDelete={noop} showToast={noop} />)
    expect(queryByText('Collection log')).not.toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// SALES FORM
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: SalesForm loading state', () => {
  it('shows skeleton, not the real "Sales log" label, when loading=true', () => {
    const { queryByText } = render(<SalesForm loading={true} cratesInFarm={0} onSave={noop} onDelete={noop} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />)
    expect(queryByText('Sales log')).toBeNull()
  })

  it('shows real content once loading=false', () => {
    const { queryByText } = render(<SalesForm loading={false} sales={[]} cratesInFarm={0} onSave={noop} onDelete={noop} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />)
    expect(queryByText('Sales log')).not.toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// EXPENSE TRACKER
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: ExpenseTracker loading state', () => {
  it('shows skeleton, not the real Revenue card, when loading=true', () => {
    const { queryByText } = render(<ExpenseTracker loading={true} onAdd={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Revenue')).toBeNull()
  })

  it('shows real content once loading=false', () => {
    const { queryByText } = render(<ExpenseTracker loading={false} expenses={[]} onAdd={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Revenue')).not.toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// CUSTOMER MANAGER
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: CustomerManager loading state', () => {
  it('shows skeleton, not the real "Add customer" button, when loading=true', () => {
    const { queryByText } = render(<CustomerManager loading={true} onAdd={noop} onUpdate={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Add customer')).toBeNull()
  })

  it('shows real content once loading=false', () => {
    const { queryByText } = render(<CustomerManager loading={false} customers={[]} onAdd={noop} onUpdate={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Add customer')).not.toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// HISTORY LOG
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: HistoryLog loading state', () => {
  it('shows skeleton, not the real "Export data" label, when loading=true', () => {
    const { queryByText } = render(<HistoryLog loading={true} onClearAll={noop} showToast={noop} isAdmin={true} />)
    expect(queryByText('Export data')).toBeNull()
  })

  it('shows real content once loading=false', () => {
    const { queryByText } = render(<HistoryLog loading={false} sales={[]} collections={[]} payments={[]} onClearAll={noop} showToast={noop} isAdmin={true} />)
    expect(queryByText('Export data')).not.toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════
// CREDIT TRACKER (re-verified alongside the others)
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: CreditTracker loading state', () => {
  it('shows skeleton, not the filter chips, when loading=true', () => {
    const { queryAllByText } = render(<CreditTracker loading={true} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />)
    expect(queryAllByText('Settled')).toHaveLength(0)
  })

  it('shows real content once loading=false', () => {
    const { queryAllByText } = render(<CreditTracker loading={false} sales={[]} payments={[]} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />)
    expect(queryAllByText('Settled').length).toBeGreaterThan(0)
  })
})

// ════════════════════════════════════════════════════════════════════════
// All six default to loading=false safely when the prop is omitted —
// guards against any future caller forgetting to pass it.
// ════════════════════════════════════════════════════════════════════════
describe('REGRESSION: every component defaults to non-loading state safely', () => {
  it('CollectionForm renders real content with no loading prop at all', () => {
    const { queryByText } = render(<CollectionForm onSave={noop} onDelete={noop} showToast={noop} />)
    expect(queryByText('Collection log')).not.toBeNull()
  })
  it('SalesForm renders real content with no loading prop at all', () => {
    const { queryByText } = render(<SalesForm cratesInFarm={0} onSave={noop} onDelete={noop} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />)
    expect(queryByText('Sales log')).not.toBeNull()
  })
  it('ExpenseTracker renders real content with no loading prop at all', () => {
    const { queryByText } = render(<ExpenseTracker onAdd={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Revenue')).not.toBeNull()
  })
  it('CustomerManager renders real content with no loading prop at all', () => {
    const { queryByText } = render(<CustomerManager onAdd={noop} onUpdate={noop} onDelete={noop} isAdmin={true} />)
    expect(queryByText('Add customer')).not.toBeNull()
  })
  it('HistoryLog renders real content with no loading prop at all', () => {
    const { queryByText } = render(<HistoryLog onClearAll={noop} showToast={noop} isAdmin={true} />)
    expect(queryByText('Export data')).not.toBeNull()
  })
})
