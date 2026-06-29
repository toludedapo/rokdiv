import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CreditTracker from '../src/components/CreditTracker'

const noop = () => {}

describe('REGRESSION: CreditTracker loading state (zero-flash on refresh)', () => {
  it('renders the skeleton, not real content, when loading=true', () => {
    const { queryAllByText } = render(
      <CreditTracker loading={true} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )
    // The real (non-loading) view always shows filter chips like "Settled" — absent during skeleton
    expect(queryAllByText('Settled')).toHaveLength(0)
  })

  it('renders real content (filter chips, empty state) once loading=false with empty data', () => {
    const { queryAllByText } = render(
      <CreditTracker loading={false} sales={[]} payments={[]} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )
    expect(queryAllByText('Settled').length).toBeGreaterThan(0)
  })

  it('defaults to false (shows real content) when loading prop is omitted entirely', () => {
    const { queryAllByText } = render(
      <CreditTracker sales={[]} payments={[]} onMarkPaid={noop} onAddPayment={noop} onDeletePayment={noop} onReturnCrates={noop} isAdmin={true} />
    )
    expect(queryAllByText('Settled').length).toBeGreaterThan(0)
  })
})
