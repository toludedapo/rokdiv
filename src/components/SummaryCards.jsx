import { useMemo } from 'react'

const NAIRA = String.fromCharCode(0x20A6)
const fmt = (n) => NAIRA + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })

export default function SummaryCards({ collections, sales, expenses = [] }) {
  const now = new Date()

  // ── Run-rate: last 7 days of sales (by egg count, all sale types) ───────────
  const runRate = useMemo(() => {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    const recent = sales.filter(s => new Date(s.date) >= cutoff)
    if (recent.length === 0) return null

    // Unique days that had sales
    const days = new Set(recent.map(s => s.date)).size
    const totalEggs = recent.reduce((sum, s) => sum + (parseInt(s.crates || 0) * 30), 0)
    return days >= 1 ? totalEggs / 7 : null   // daily average over full 7-day window
  }, [sales])

  // ── Inventory ───────────────────────────────────────────────────────────────
  const totalCollected = useMemo(
    () => collections.reduce((s, c) => s + (parseInt(c.crates || 0) * 30 + parseInt(c.loose_eggs || 0)), 0),
    [collections]
  )
  const totalSold = useMemo(
    () => sales.reduce((s, sale) => s + (parseInt(sale.crates || 0) * 30), 0),
    [sales]
  )
  const inStockEggs = Math.max(0, totalCollected - totalSold)
  const inStockCrates = Math.floor(inStockEggs / 30)
  const LOW_STOCK_THRESHOLD = 1500  // 50 crates
  const isLowStock = inStockEggs > 0 && inStockEggs < LOW_STOCK_THRESHOLD

  let daysLeft = null
  if (runRate && runRate > 0 && inStockEggs > 0) {
    daysLeft = Math.round(inStockEggs / runRate)
  }

  // ── Revenue (this month) ────────────────────────────────────────────────────
  const monthRevenue = useMemo(() => {
    return sales
      .filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  }, [sales])

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

  // ── Outstanding credit ──────────────────────────────────────────────────────
  const outstanding = useMemo(
    () => sales.filter(s => s.payment_status === 'Credit' && !s.paid_at)
               .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
    [sales]
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
        <div style={{
          ...cardBase,
          ...(isLowStock ? lowStockStyle : {})
        }}>
          <p style={cardLabel}>In Stock</p>
          <p style={{ ...cardValue, color: isLowStock ? '#EF4444' : '#4F6EF7' }}>
            {inStockCrates.toLocaleString()}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
          </p>
          <p style={cardSub}>
            {inStockEggs.toLocaleString()} eggs
          </p>
          {isLowStock && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
              ⚠ Low stock
            </p>
          )}
          {daysLeft !== null && !isLowStock && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7280' }}>
              ~{daysLeft} day{daysLeft !== 1 ? 's' : ''} left at current rate
            </p>
          )}
          {runRate === null && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9CA3AF' }}>
              No recent sales run-rate
            </p>
          )}
        </div>

        {/* Monthly Revenue */}
        <div style={cardBase}>
          <p style={cardLabel}>Revenue (this month)</p>
          <p style={{ ...cardValue, color: '#10B981' }}>{fmt(monthRevenue)}</p>
          <p style={cardSub}>from {sales.filter(s => {
            const d = new Date(s.date)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
          }).length} sale{sales.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Outstanding */}
        <div style={cardBase}>
          <p style={cardLabel}>Outstanding</p>
          <p style={{ ...cardValue, color: outstanding > 0 ? '#F59E0B' : '#10B981' }}>
            {outstanding > 0 ? fmt(outstanding) : 'Clear'}
          </p>
          <p style={cardSub}>
            {outstanding > 0
              ? `${sales.filter(s => s.payment_status === 'Credit' && !s.paid_at).length} debtor${sales.filter(s => s.payment_status === 'Credit' && !s.paid_at).length !== 1 ? 's' : ''}`
              : 'No unpaid credit'}
          </p>
        </div>

        {/* Net Profit or Total Collected */}
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
              {collections.filter(c => {
                const d = new Date(c.date)
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
              }).reduce((s, c) => s + parseInt(c.crates || 0), 0).toLocaleString()}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
            </p>
            <p style={cardSub}>Log expenses to see profit</p>
          </div>
        )}
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
