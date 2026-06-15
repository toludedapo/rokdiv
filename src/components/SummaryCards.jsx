import { useMemo, useState } from 'react'

const NAIRA = String.fromCharCode(0x20A6)
const fmt = (n) => NAIRA + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })

function eggsFromRecord(r) {
  return (parseInt(r.crates || 0) * 30) + parseInt(r.singles || r.loose_eggs || 0)
}

// ── Collection Trend Chart (14 days, pure SVG) ───────────────────────────────
function CollectionChart({ collections }) {
  const days = 14
  const today = new Date()
  today.setHours(0,0,0,0)

  const data = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (days - 1 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const eggs = collections
        .filter(c => c.date === dateStr)
        .reduce((s, c) => s + eggsFromRecord(c), 0)
      return { date: dateStr, eggs, label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) }
    })
  }, [collections])

  const avg = data.reduce((s, d) => s + d.eggs, 0) / days
  const max = Math.max(...data.map(d => d.eggs), avg * 1.2, 300)

  const W = 100
  const H = 40
  const barW = W / days - 0.8

  return (
    <div style={{ ...cardBase, marginBottom: '10px', padding: '12px 14px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p style={cardLabel}>14-Day Collection Trend</p>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
          avg {Math.round(avg).toLocaleString()} eggs/day
        </span>
      </div>
      <svg viewBox={`0 0 100 ${H + 14}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
        {/* Average line */}
        {avg > 0 && (
          <line
            x1="0" y1={H - (avg / max) * H}
            x2="100" y2={H - (avg / max) * H}
            stroke="#E5E7EB" strokeWidth="0.4" strokeDasharray="1,1"
          />
        )}
        {/* Bars */}
        {data.map((d, i) => {
          const barH = max > 0 ? (d.eggs / max) * H : 0
          const x = i * (W / days) + 0.4
          const isAboveAvg = d.eggs >= avg
          const isEmpty = d.eggs === 0
          const isToday = d.date === today.toISOString().slice(0, 10)
          return (
            <g key={d.date}>
              <rect
                x={x} y={H - barH} width={barW} height={Math.max(barH, isEmpty ? 0 : 0.5)}
                rx="0.8"
                fill={isEmpty ? '#F3F4F6' : isAboveAvg ? '#4F6EF7' : '#FCD34D'}
                opacity={isToday ? 1 : 0.85}
              />
              {/* Date label every 3rd bar */}
              {i % 3 === 0 && (
                <text x={x + barW / 2} y={H + 10} textAnchor="middle"
                  fontSize="3" fill="#9CA3AF">
                  {d.label.split(' ')[0]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6B7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4F6EF7', display: 'inline-block' }} />
          Above avg
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6B7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FCD34D', display: 'inline-block' }} />
          Below avg
        </span>
      </div>
    </div>
  )
}

export default function SummaryCards({ collections, sales, expenses = [], payments = [], isDesktop = false }) {
  const now = new Date()

  const runRate = useMemo(() => {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    const recent = sales.filter(s => new Date(s.date) >= cutoff)
    if (recent.length === 0) return null
    const totalEggs = recent.reduce((sum, s) => sum + eggsFromRecord(s), 0)
    return totalEggs / 7
  }, [sales])

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

  const thisMonthSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }), [sales])

  const monthRevenue = useMemo(
    () => thisMonthSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
    [thisMonthSales]
  )

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isDesktop ? '14px' : '10px', marginBottom: isDesktop ? '14px' : '10px' }}>
        <div style={{ ...cardBase, ...(isLowStock ? lowStockStyle : {}), padding: isDesktop ? '22px' : '14px' }}>
          <p style={{ ...cardLabel, fontSize: isDesktop ? '12px' : '11px' }}>In Stock</p>
          <p style={{ ...cardValue, fontSize: isDesktop ? '32px' : '22px', color: isLowStock ? '#EF4444' : '#4F6EF7' }}>
            {inStockCrates.toLocaleString()}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
          </p>
          <p style={cardSub}>{inStockEggs.toLocaleString()} eggs{inStockSingles > 0 ? ` (+${inStockSingles})` : ''}</p>
          {isLowStock && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>⚠ Low stock</p>}
          {daysLeft !== null && !isLowStock && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7280' }}>
              ~{daysLeft} day{daysLeft !== 1 ? 's' : ''} left at current rate
            </p>
          )}
        </div>

        <div style={{ ...cardBase, padding: isDesktop ? '22px' : '14px' }}>
          <p style={{ ...cardLabel, fontSize: isDesktop ? '12px' : '11px' }}>Revenue (this month)</p>
          <p style={{ ...cardValue, fontSize: isDesktop ? '32px' : '22px', color: '#10B981' }}>{fmt(monthRevenue)}</p>
          <p style={{ ...cardSub, fontSize: isDesktop ? '13px' : '11px' }}>from {thisMonthSales.length} sale{thisMonthSales.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={{ ...cardBase, padding: isDesktop ? '22px' : '14px' }}>
          <p style={{ ...cardLabel, fontSize: isDesktop ? '12px' : '11px' }}>Outstanding</p>
          <p style={{ ...cardValue, fontSize: isDesktop ? '32px' : '22px', color: outstanding > 0 ? '#F59E0B' : '#10B981' }}>
            {outstanding > 0 ? fmt(outstanding) : 'Clear'}
          </p>
          <p style={{ ...cardSub, fontSize: isDesktop ? '13px' : '11px' }}>
            {outstanding > 0 ? `${creditSales.length} debtor${creditSales.length !== 1 ? 's' : ''}` : 'No unpaid credit'}
          </p>
        </div>

        {hasExpenseData ? (
          <div style={{ ...cardBase, padding: isDesktop ? '22px' : '14px' }}>
            <p style={{ ...cardLabel, fontSize: isDesktop ? '12px' : '11px' }}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'} (month)</p>
            <p style={{ ...cardValue, fontSize: isDesktop ? '32px' : '22px', color: netProfit >= 0 ? '#4F6EF7' : '#EF4444' }}>
              {fmt(Math.abs(netProfit))}
            </p>
            <p style={{ ...cardSub, fontSize: isDesktop ? '13px' : '11px' }}>after {fmt(monthExpenses)} expenses</p>
          </div>
        ) : (
          <div style={{ ...cardBase, padding: isDesktop ? '22px' : '14px' }}>
            <p style={{ ...cardLabel, fontSize: isDesktop ? '12px' : '11px' }}>Collected (month)</p>
            <p style={{ ...cardValue, fontSize: isDesktop ? '32px' : '22px', color: '#4F6EF7' }}>
              {monthCollectedCrates.toLocaleString()}
              <span style={{ fontSize: isDesktop ? '14px' : '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '3px' }}>crates</span>
            </p>
            <p style={{ ...cardSub, fontSize: isDesktop ? '13px' : '11px' }}>Log expenses to see profit</p>
          </div>
        )}
      </div>

      {/* Crates Sold card */}
      <div style={{ ...cardBase, marginBottom: isDesktop ? '14px' : '10px', padding: isDesktop ? '22px' : '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Collection Trend Chart */}
      {collections.length > 0 && <CollectionChart collections={collections} />}

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

      {/* Recent Sales - desktop only */}
      {isDesktop && sales.length > 0 && (
        <div style={{ ...cardBase, marginTop: '16px' }}>
          <p style={cardLabel}>Recent Sales</p>
          {[...sales].slice(0, 5).map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < Math.min(sales.length, 5) - 1 ? '1px solid #F3F4F6' : 'none'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827' }}>{s.customer_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                  {new Date(s.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  {' · '}{parseInt(s.crates || 0)} crate{parseInt(s.crates || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                  {String.fromCharCode(0x20A6)}{Number(s.amount).toLocaleString('en-NG')}
                </p>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px',
                  background: s.payment_status === 'Paid' ? '#ECFDF5' : '#FFFBEB',
                  color: s.payment_status === 'Paid' ? '#059669' : '#D97706'
                }}>{s.payment_status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const qaBtn = (color, bg, border) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '6px', padding: '16px 8px', background: bg, border: `1.5px solid ${border}`,
  borderRadius: '14px', cursor: 'pointer', color, transition: 'opacity 0.15s ease'
})

const cardBase = {
  background: 'white', borderRadius: '16px', padding: '14px',
  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid transparent',
  transition: 'border-color 0.3s ease',
}
const lowStockStyle = {
  animation: 'lowStockPulse 2s ease-in-out infinite',
  border: '1.5px solid #FCA5A5',
}
const cardLabel = {
  margin: '0 0 4px', fontSize: '11px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF',
}
const cardValue = {
  margin: '0 0 2px', fontSize: '22px', fontWeight: 800,
  lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
}
const cardSub = { margin: 0, fontSize: '11px', color: '#9CA3AF' }