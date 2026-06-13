import { useMemo } from 'react'

const NAIRA = String.fromCharCode(0x20A6)
const fmt = (n) => NAIRA + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })

// Helper - works with both {crates, singles} and {crates, loose_eggs} schemas
function eggsFromRecord(r) {
  return (parseInt(r.crates || 0) * 30) + parseInt(r.singles || r.loose_eggs || 0)
}

export default function SummaryCards({ collections, sales, expenses = [], payments = [] }) {
  const now = new Date()

  // ── Run-rate: last 7 days of sales ─────────────────────────────────────────
  const runRate = useMemo(() => {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    const recent = sales.filter(s => new Date(s.date) >= cutoff)
    if (recent.length === 0) return null
    const totalEggs = recent.reduce((sum, s) => sum + eggsFromRecord(s), 0)
    return totalEggs / 7
  }, [sales])

  // ── Inventory ───────────────────────────────────────────────────────────────
  const totalCollected = useMemo(
    () => collections.reduce((s, c) => s + eggsFromRecord(c), 0),
    [collections]
  )
  const totalSoldEggs = useMemo(
    () => sales.reduce((s, sale) => s + eggsFromRecord(sale), 0),
    [sales]
  )
  const totalSoldCrates = useMemo(
    () => sales.reduce((s, sale) => s + parseInt(sale.crates || 0), 0),
    [sales]
  )
  const inStockEggs = Math.max(0, totalCollected - totalSoldEggs)
  const inStockCrates = Math.floor(inStockEggs / 30)
  const inStockSingles = inStockEggs % 30
  const LOW_STOCK_THRESHOLD = 1500
  const isLowStock = inStockEggs > 0 && inStockEggs < LOW_STOCK_THRESHOLD

  let daysLeft = null
  if (runRate && runRate > 0 && inStockEggs > 0) {
    daysLeft = Math.round(inStockEggs / runRate)
  }

  // ── Revenue (this month) ────────────────────────────────────────────────────
  const thisMonthSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }), [sales])

  const monthRevenue = useMemo(
    () => thisMonthSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
    [thisMonthSales]
  )

  // ── Expenses (this month) ───────────────────────────────────────────────────
  const monthExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }, [expenses])

  const netProfit = monthRevenue - monthExpenses
  const hasExpenseData = monthExpenses > 0

  // ── Outstanding credit (deduct partial payments) ───────────────────────────
  const creditSales = useMemo(
    () => sales.filter(s => s.payment_status === 'Credit' && !s.paid_at),
    [sales]
  )
  const paidBySale = useMemo(() => {
    const map = {}
    for (const p of payments) {
      map[p.sale_id] = (map[p.sale_id] || 0) + parseFloat(p.amount || 0)
    }
    return map
  }, [payments])
  const outstanding = useMemo(
    () => creditSales.reduce((sum, s) => {
      const alreadyPaid = paidBySale[s.id] || 0
      return sum + Math.max(0, parseFloat(s.amount || 0) - alreadyPaid)
    }, 0),
    [creditSales, paidBySale]
  )

  // ── Collection streak ───────────────────────────────────────────────────────
  const streak = useMemo(() => {
    const dates = [...new Set(collections.map(c => c.date))].sort().reverse()
    if (dates.length === 0) return 0
    let count = 0
    let cursor = new Date(now)
    cursor.setHours(0,0,0,0)
    for (const d of dates) {
      const day = new Date(d)
      day.setHours(0,0,0,0)
      const diff = Math.round((cursor - day) / 86400000)
      if (diff === 0 || diff === 1) { count++; cursor = day }
      else break
    }
    return count
  }, [collections])

  // ── This month collections ──────────────────────────────────────────────────
  const monthCollectedCrates = useMemo(() => {
    return collections
      .filter(c => {
        const d = new Date(c.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((s, c) => s + parseInt(c.crates || 0), 0)
  }, [collections])

  return (
    <div>
      {/* Streak banner */}
      {streak >= 2 && (
        <div style={{
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          borderRadius: '12px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '12px', border: '1px solid #FCD34D'
        }}>
          <span style={{ fontSize: '20px' }}>🔥</span>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
              {streak}-day collection streak
            </span>
            <span style={{ fontSize: '12px', color: '#B45309', marginLeft: '6px' }}>Keep it up!</span>
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>

        {/* In Stock */}
        <div style={{ ...cardBase, ...(isLowStock ? lowStockStyle : {}) }}>
          <p style={cardLabel}>In Stock</p>
          <p style={{ ...cardValue, color: isLowStock ? '#EF4444' : '#4F6EF7' }}>
            {inStockCrates.toLocaleString()}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
          </p>
          <p style={cardSub}>{inStockEggs.toLocaleString()} eggs{inStockSingles > 0 ? ` (+${inStockSingles})` : ''}</p>
          {isLowStock && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>⚠ Low stock</p>
          )}
          {daysLeft !== null && !isLowStock && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7280' }}>
              ~{daysLeft} day{daysLeft !== 1 ? 's' : ''} left at current rate
            </p>
          )}
        </div>

        {/* Monthly Revenue */}
        <div style={cardBase}>
          <p style={cardLabel}>Revenue (this month)</p>
          <p style={{ ...cardValue, color: '#10B981' }}>{fmt(monthRevenue)}</p>
          <p style={cardSub}>from {thisMonthSales.length} sale{thisMonthSales.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Outstanding */}
        <div style={cardBase}>
          <p style={cardLabel}>Outstanding</p>
          <p style={{ ...cardValue, color: outstanding > 0 ? '#F59E0B' : '#10B981' }}>
            {outstanding > 0 ? fmt(outstanding) : 'Clear'}
          </p>
          <p style={cardSub}>
            {outstanding > 0
              ? `${creditSales.length} debtor${creditSales.length !== 1 ? 's' : ''}`
              : 'No unpaid credit'}
          </p>
        </div>

        {/* Net Profit / Collected / Crates Sold */}
        {hasExpenseData ? (
          <div style={cardBase}>
            <p style={cardLabel}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'} (month)</p>
            <p style={{ ...cardValue, color: netProfit >= 0 ? '#4F6EF7' : '#EF4444' }}>
              {fmt(Math.abs(netProfit))}
            </p>
            <p style={cardSub}>after {fmt(monthExpenses)} expenses</p>
          </div>
        ) : (
          <div style={cardBase}>
            <p style={cardLabel}>Collected (month)</p>
            <p style={{ ...cardValue, color: '#4F6EF7' }}>
              {monthCollectedCrates.toLocaleString()}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
            </p>
            <p style={cardSub}>Log expenses to see profit</p>
          </div>
        )}
      </div>

      {/* Crates Sold card - full width */}
      <div style={{ ...cardBase, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={cardLabel}>Total Crates Sold</p>
          <p style={{ ...cardValue, color: '#8B5CF6', margin: 0 }}>
            {totalSoldCrates.toLocaleString()}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ ...cardLabel, margin: '0 0 4px' }}>This Month</p>
          <p style={{ ...cardValue, fontSize: '16px', color: '#8B5CF6', margin: 0 }}>
            {thisMonthSales.reduce((s, sale) => s + parseInt(sale.crates || 0), 0).toLocaleString()}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('rokdiv-nav', { detail: 'collect' }))}
          style={qaBtn('#10B981', '#ECFDF5', '#A7F3D0')}>
          <span style={{ fontSize: '20px' }}>🥚</span>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Log Collection</span>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('rokdiv-nav', { detail: 'sales' }))}
          style={qaBtn('#4F6EF7', '#EEF1FF', '#C7D2FE')}>
          <span style={{ fontSize: '20px' }}>🛒</span>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Record Sale</span>
        </button>
      </div>
    </div>
  )
}

const qaBtn = (color, bg, border) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '6px', padding: '16px 8px', background: bg, border: `1.5px solid ${border}`,
  borderRadius: '14px', cursor: 'pointer', color, transition: 'opacity 0.15s ease'
})

const cardBase = {
  background: 'white',
  borderRadius: '14px',
  padding: '14px',
  boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
  border: '1px solid transparent',
  transition: 'border-color 0.3s ease',
}
const lowStockStyle = {
  animation: 'lowStockPulse 2s ease-in-out infinite',
  border: '1.5px solid #FCA5A5',
}
const cardLabel = {
  margin: '0 0 4px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9CA3AF',
}
const cardValue = {
  margin: '0 0 2px',
  fontSize: '22px',
  fontWeight: 800,
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
}
const cardSub = {
  margin: 0,
  fontSize: '11px',
  color: '#9CA3AF',
}