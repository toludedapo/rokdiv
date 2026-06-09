import React from 'react'
import { TrendingUp, AlertCircle, Archive, Egg } from 'lucide-react'
import { fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'

export default function SummaryCards({ sales, collections, paymentsTotal = 0 }) {
  const totalCollected = collections.reduce((s, c) => s + c.crates * CRATE_SIZE + c.singles, 0)
  const totalSold      = sales.reduce((s, sale) => s + sale.crates * CRATE_SIZE + sale.singles, 0)
  const inStock        = Math.max(0, totalCollected - totalSold)
  const revenue        = sales.filter(s => s.payment_status === 'Paid').reduce((s, sale) => s + Number(sale.amount), 0)
  const rawDebt        = sales.filter(s => s.payment_status === 'Credit').reduce((s, sale) => s + Number(sale.amount), 0)
  const debt           = Math.max(0, rawDebt - paymentsTotal)
  const debtors        = new Set(
    sales.filter(s => s.payment_status === 'Credit').map(s => s.customer_name?.trim().toLowerCase())
  ).size

  const cards = [
    {
      icon: Archive,
      label: 'In Stock',
      value: inStock.toLocaleString(),
      sub: `${Math.floor(inStock / CRATE_SIZE)} crates + ${inStock % CRATE_SIZE} singles`,
      accent: '#9FD46A',
      bg: 'rgba(122,181,72,0.06)',
    },
    {
      icon: Egg,
      label: 'Total Collected',
      value: totalCollected.toLocaleString(),
      sub: `${Math.floor(totalCollected / CRATE_SIZE)} crates lifetime`,
      accent: '#E8B75A',
      bg: 'rgba(224,160,48,0.06)',
    },
    {
      icon: TrendingUp,
      label: 'Revenue',
      value: fmtNaira(revenue + paymentsTotal),
      sub: 'Cash received',
      accent: '#9FD46A',
      bg: 'rgba(122,181,72,0.06)',
    },
    {
      icon: AlertCircle,
      label: 'Outstanding',
      value: fmtNaira(debt),
      sub: `${debtors} debtor${debtors !== 1 ? 's' : ''} on credit`,
      accent: debt > 0 ? '#F07060' : '#4A6336',
      bg: debt > 0 ? 'rgba(220,60,40,0.06)' : 'transparent',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
      {cards.map(({ icon: Icon, label, value, sub, accent, bg }, i) => (
        <div
          key={i}
          style={{
            background: '#162010',
            border: '1px solid #2D4020',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="label" style={{ marginBottom: 0 }}>{label}</span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: bg || 'rgba(122,181,72,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={14} style={{ color: accent }} />
            </div>
          </div>
          <p className="num" style={{ fontSize: 20, fontWeight: 600, color: '#F0EDE8', lineHeight: 1 }}>
            {value}
          </p>
          <p style={{ fontSize: 11, color: '#4A6336', marginTop: 5 }}>{sub}</p>
        </div>
      ))}
    </div>
  )
}
