import React, { useMemo } from 'react'
import { TrendingUp, AlertCircle, Archive, Egg, Flame, ArrowUpRight } from 'lucide-react'
import { fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'

const LOW_STOCK_EGGS = 1500

function computeStreak(collections) {
  if (!collections.length) return 0
  const dates = [...new Set(collections.map(c => c.date))].sort((a, b) => b.localeCompare(a))
  if (!dates.length) return 0
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yest = new Date(today); yest.setDate(yest.getDate() - 1)
  const yestStr = yest.toISOString().slice(0, 10)
  if (dates[0] !== todayStr && dates[0] !== yestStr) return 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    if (Math.round((prev - curr) / 86400000) === 1) streak++
    else break
  }
  return streak
}

function computeRunRate(sales) {
  const now = new Date()
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const recent = sales.filter(s => s.date >= cutoffStr)
  if (!recent.length) return null
  const totalEggs = recent.reduce((sum, s) => sum + s.crates * CRATE_SIZE + s.singles, 0)
  const firstDate = recent.reduce((min, s) => s.date < min ? s.date : min, recent[0].date)
  const daySpan   = Math.max(1, Math.round((now - new Date(firstDate)) / 86400000) + 1)
  return totalEggs / Math.min(daySpan, 7)
}

export default function SummaryCards({ sales, collections, paymentsTotal = 0 }) {
  const totalCollected = collections.reduce((s, c) => s + c.crates * CRATE_SIZE + c.singles, 0)
  const totalSold      = sales.reduce((s, sale) => s + sale.crates * CRATE_SIZE + sale.singles, 0)
  const inStock        = Math.max(0, totalCollected - totalSold)
  const revenue        = sales.filter(s => s.payment_status === 'Paid').reduce((s, sale) => s + Number(sale.amount), 0)
  const rawDebt        = sales.filter(s => s.payment_status === 'Credit').reduce((s, sale) => s + Number(sale.amount), 0)
  const debt           = Math.max(0, rawDebt - paymentsTotal)
  const debtors        = new Set(sales.filter(s => s.payment_status === 'Credit').map(s => s.customer_name?.trim().toLowerCase())).size

  const streak  = useMemo(() => computeStreak(collections), [collections])
  const runRate = useMemo(() => computeRunRate(sales), [sales])

  const forecastLabel = useMemo(() => {
    if (runRate === null || runRate <= 0) return 'No recent sales data'
    const days = inStock / runRate
    if (days < 1)  return 'Out of stock today!'
    if (days < 2)  return 'Out of stock tomorrow'
    return `~${Math.round(days)} days of stock left`
  }, [runRate, inStock])

  const isLowStock = inStock < LOW_STOCK_EGGS && inStock > 0

  const cardBase = {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '16px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1.5px solid transparent',
  }

  return (
    <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Streak banner */}
      {streak >= 2 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
          border: '1.5px solid #FDE68A',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(217,119,6,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="streak-glow" style={{ fontSize: 22 }}>🔥</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {streak}-day collection streak!
              </p>
              <p style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                Consistent collections build stronger yields
              </p>
            </div>
          </div>
          <span className="num" style={{ fontSize: 28, fontWeight: 700, color: '#FDE68A' }}>
            {streak}
          </span>
        </div>
      )}

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* In Stock */}
        <div
          className={isLowStock ? 'stock-warn' : ''}
          style={{ ...cardBase, border: isLowStock ? '1.5px solid rgba(217,119,6,0.4)' : '1.5px solid #F3F4F6' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>In Stock</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: isLowStock ? '#FFFBEB' : '#EEF1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={14} style={{ color: isLowStock ? '#D97706' : '#4F6EF7' }} />
            </div>
          </div>
          <p className="num" style={{ fontSize: 22, fontWeight: 700, color: isLowStock ? '#D97706' : '#111827', lineHeight: 1 }}>
            {inStock.toLocaleString()}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {Math.floor(inStock / CRATE_SIZE)} crates + {inStock % CRATE_SIZE} singles
          </p>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={10} style={{ color: isLowStock ? '#D97706' : '#9CA3AF', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: isLowStock ? '#D97706' : '#9CA3AF', fontWeight: 500 }}>
              {forecastLabel}
            </span>
          </div>
          {isLowStock && (
            <p style={{ fontSize: 10, color: '#D97706', fontWeight: 700, marginTop: 4 }}>
              ⚠️ Below 50-crate threshold
            </p>
          )}
        </div>

        {/* Collected */}
        <div style={{ ...cardBase, border: '1.5px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Collected</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Egg size={14} style={{ color: '#059669' }} />
            </div>
          </div>
          <p className="num" style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {totalCollected.toLocaleString()}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {Math.floor(totalCollected / CRATE_SIZE)} crates lifetime
          </p>
          {runRate !== null && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
                {Math.round(runRate).toLocaleString()} eggs/day avg
              </span>
            </div>
          )}
        </div>

        {/* Revenue */}
        <div style={{ ...cardBase, border: '1.5px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Revenue</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EEF1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} style={{ color: '#4F6EF7' }} />
            </div>
          </div>
          <p className="num" style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {fmtNaira(revenue + paymentsTotal)}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Cash received</p>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 10, color: '#4F6EF7', fontWeight: 600 }}>
              +{fmtNaira(paymentsTotal)} from part payments
            </span>
          </div>
        </div>

        {/* Outstanding */}
        <div style={{
          ...cardBase,
          border: debt > 0 ? '1.5px solid #FECACA' : '1.5px solid #F3F4F6',
          background: debt > 0 ? '#FFFAFA' : '#FFFFFF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Outstanding</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: debt > 0 ? '#FEF2F2' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={14} style={{ color: debt > 0 ? '#DC2626' : '#9CA3AF' }} />
            </div>
          </div>
          <p className="num" style={{ fontSize: 22, fontWeight: 700, color: debt > 0 ? '#DC2626' : '#111827', lineHeight: 1 }}>
            {fmtNaira(debt)}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {debtors} debtor{debtors !== 1 ? 's' : ''} on credit
          </p>
        </div>
      </div>
    </div>
  )
}
