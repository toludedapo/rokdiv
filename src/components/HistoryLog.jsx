import React, { useState } from 'react'
import { History, Download } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from '../utils/exportUtils.js'

export default function HistoryLog({ sales, collections, onClearAll, showToast }) {
  const [tab, setTab] = useState('sales')

  const sorted = tab === 'sales'
    ? [...sales].sort((a, b) => (a.date < b.date ? 1 : -1))
    : [...collections].sort((a, b) => (a.date < b.date ? 1 : -1))

  const card = {
    background: '#162010',
    border: '1px solid #2D4020',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  }

  return (
    <div className="mx-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Export */}
      <div style={{ ...card, padding: '14px 16px' }}>
        <p className="label" style={{ marginBottom: 10 }}>Export Data</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Sales CSV', fn: () => { exportSalesCSV(sales); showToast('Sales CSV downloaded') } },
            { label: 'Collections CSV', fn: () => { exportCollectionsCSV(collections); showToast('Collections CSV downloaded') } },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#1C2A14',
                border: '1px solid #2D4020',
                borderRadius: 12,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 600,
                color: '#6A806A',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Download size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Records */}
      <div style={card}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2D4020' }}>
          {[['sales', 'Sales', sales.length], ['collections', 'Collections', collections.length]].map(([id, lbl, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 12,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: tab === id ? '#9FD46A' : '#4A6336',
                borderBottom: tab === id ? '2px solid #7AB548' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {lbl} <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, opacity: 0.8 }}>({count})</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div>
          {sorted.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <History size={28} style={{ margin: '0 auto 10px', color: '#2D4020' }} />
              <p style={{ fontSize: 13, color: '#4A6336' }}>No records yet</p>
            </div>
          )}
          {sorted.map((item, idx) => (
            tab === 'sales' ? (
              <div
                key={item.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < sorted.length - 1 ? '1px solid #2D4020' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8' }}>{item.customer_name}</p>
                  <p style={{ fontSize: 11, color: '#4A6336', marginTop: 2 }}>
                    {fmtDate(item.date)} · {(item.crates * CRATE_SIZE + item.singles).toLocaleString()} eggs
                  </p>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                      background: item.payment_status === 'Paid' ? 'rgba(122,181,72,0.15)' : 'rgba(224,160,48,0.15)',
                      color: item.payment_status === 'Paid' ? '#9FD46A' : '#E8B75A',
                      border: `1px solid ${item.payment_status === 'Paid' ? 'rgba(122,181,72,0.2)' : 'rgba(224,160,48,0.2)'}`,
                    }}>
                      {item.payment_status}
                    </span>
                    {item.crates_loaned > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(224,160,48,0.1)', color: '#E8B75A', border: '1px solid rgba(224,160,48,0.2)' }}>
                        {item.crates_loaned} loaned, {item.crates_returned || 0} back
                      </span>
                    )}
                  </div>
                </div>
                <span className="num" style={{ fontSize: 13, fontWeight: 600, color: '#E8B75A', flexShrink: 0 }}>
                  {fmtNaira(item.amount)}
                </span>
              </div>
            ) : (
              <div
                key={item.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < sorted.length - 1 ? '1px solid #2D4020' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8' }}>{fmtDate(item.date)}</p>
                  <p style={{ fontSize: 11, color: '#4A6336', marginTop: 2 }}>
                    {item.crates} crates + {item.singles} singles{item.notes ? ` · ${item.notes}` : ''}
                  </p>
                </div>
                <span className="num" style={{ fontSize: 13, fontWeight: 600, color: '#9FD46A' }}>
                  {(item.crates * CRATE_SIZE + item.singles).toLocaleString()}
                </span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...card, padding: '14px 16px', border: '1px solid rgba(220,60,40,0.2)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#F07060', marginBottom: 4 }}>Danger Zone</p>
        <p style={{ fontSize: 11, color: '#4A6336', marginBottom: 12 }}>Export your data before clearing.</p>
        <button
          onClick={() => { if (window.confirm('Delete ALL records permanently? This cannot be undone.')) onClearAll() }}
          className="btn-danger"
        >
          Clear All Data
        </button>
      </div>
    </div>
  )
}
