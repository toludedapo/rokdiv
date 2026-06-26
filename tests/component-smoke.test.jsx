/**
 * Real component smoke tests — these import your ACTUAL components from
 * src/components/ and render them with minimal/no props, exactly simulating
 * the moment before a Supabase hook resolves (data=undefined, loading=true).
 *
 * If any of these fail, it means a future code change removed a default
 * prop or introduced a new unguarded array access — exactly the bug class
 * that caused the Expenses tab to go blank in production.
 *
 * Run: npx vitest run
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import SummaryCards from '../src/components/SummaryCards'
import ExpenseTracker from '../src/components/ExpenseTracker'
import CreditTracker from '../src/components/CreditTracker'
import CrateInventoryCard from '../src/components/CrateInventoryCard'
import CollectionForm from '../src/components/CollectionForm'
import CustomerManager from '../src/components/CustomerManager'
import HistoryLog from '../src/components/HistoryLog'
import SalesForm from '../src/components/SalesForm'

const noop = () => {}

describe('Component smoke tests — real ROKDIV components, no array props passed', () => {

  it('SummaryCards renders without crashing with zero props', () => {
    expect(() => {
      render(<SummaryCards />)
    }).not.toThrow()
  })

  it('SummaryCards renders the loading skeleton without crashing', () => {
    expect(() => {
      render(<SummaryCards loading={true} />)
    }).not.toThrow()
  })

  it('SummaryCards renders on desktop layout without crashing', () => {
    expect(() => {
      render(<SummaryCards isDesktop={true} />)
    }).not.toThrow()
  })

  it('ExpenseTracker renders without crashing when expenses/monthlySales are undefined', () => {
    expect(() => {
      render(<ExpenseTracker onAdd={noop} onDelete={noop} isAdmin={true} />)
    }).not.toThrow()
  })

  it('CreditTracker renders without crashing with zero props', () => {
    expect(() => {
      render(<CreditTracker onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />)
    }).not.toThrow()
  })

  it('CrateInventoryCard renders without crashing when inventory is undefined', () => {
    expect(() => {
      render(<CrateInventoryCard onSetTotalOwned={noop} />)
    }).not.toThrow()
  })

  it('CrateInventoryCard renders the loading state without crashing', () => {
    expect(() => {
      render(<CrateInventoryCard loading={true} onSetTotalOwned={noop} />)
    }).not.toThrow()
  })

  it('CollectionForm renders without crashing when collections is undefined', () => {
    expect(() => {
      render(<CollectionForm onSave={noop} onDelete={noop} showToast={noop} />)
    }).not.toThrow()
  })

  it('CustomerManager renders without crashing when customers is undefined', () => {
    expect(() => {
      render(<CustomerManager onAdd={noop} onUpdate={noop} onDelete={noop} isAdmin={true} />)
    }).not.toThrow()
  })

  it('HistoryLog renders without crashing when sales/collections/payments are undefined', () => {
    expect(() => {
      render(<HistoryLog onClearAll={noop} showToast={noop} isAdmin={true} />)
    }).not.toThrow()
  })

  it('SalesForm renders without crashing when sales is undefined (REGRESSION: caught a real missing default)', () => {
    expect(() => {
      render(<SalesForm cratesInFarm={0} onSave={noop} onDelete={noop} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />)
    }).not.toThrow()
  })

  it('SalesForm renders correctly with a populated sales array', () => {
    const sales = [
      { id: '1', customer_name: 'Lapato', crates: 30, singles: 0, amount: 120000, payment_status: 'Paid', date: '2026-06-17' },
    ]
    expect(() => {
      render(<SalesForm sales={sales} cratesInFarm={50} onSave={noop} onDelete={noop} onMarkPaid={noop} onReturnCrates={noop} showToast={noop} />)
    }).not.toThrow()
  })
})

describe('Component smoke tests — with realistic populated data', () => {
  const sales = [
    { id: '1', customer_name: 'Lapato', crates: 30, singles: 0, amount: 120000, payment_status: 'Paid', date: '2026-06-17', crates_loaned: 0, crates_returned: 0 },
    { id: '2', customer_name: 'Mrs Coo', crates: 20, singles: 0, amount: 80000, payment_status: 'Credit', date: '2026-06-17', crates_loaned: 20, crates_returned: 0 },
  ]
  const collections = [
    { id: '1', date: '2026-06-17', crates: 80, singles: 0 },
  ]
  const payments = [
    { sale_id: '2', amount: 40000 },
  ]

  it('SummaryCards renders correctly with real-shaped data', () => {
    expect(() => {
      render(<SummaryCards sales={sales} collections={collections} payments={payments} />)
    }).not.toThrow()
  })

  it('CreditTracker renders correctly with real-shaped data', () => {
    expect(() => {
      render(<CreditTracker sales={sales} payments={payments} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />)
    }).not.toThrow()
  })

  it('HistoryLog renders correctly with real-shaped data', () => {
    expect(() => {
      render(<HistoryLog sales={sales} collections={collections} payments={payments} onClearAll={noop} showToast={noop} isAdmin={true} />)
    }).not.toThrow()
  })
})