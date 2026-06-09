import React, { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Package, PackageCheck, Loader2, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { fmtDate, fmtNaira, overdueInfo, crateOverdueInfo, CRATE_SIZE, todayISO } from '../utils/dateUtils.js'

export function computeDebtors(sales, payments = []) {
  const creditSales = sales.filter(s => s.payment_status === 'Credit')

  // Build per-sale paid amounts from payments table
  const paidBySale = {}
  for (const p of payments) {
    paidBySale[p.sale_id] = (paidBySale[p.sale_id] || 0) + Number(p.amount)
  }

  const map = {}
  for (const s of creditSales) {
    const key = s.customer_name?.trim().toLowerCase()
    if (!key) continue
    const saleBalance = Math.max(0, Number(s.amount) - (paidBySale[s.id] || 0))
    if (!map[key]) {
      map[key] = {
        name: s.customer_name.trim(),
        owed: 0,
        eggs: 0,
        oldest: s.date,
        sales: [],
        cratesOut: 0,
        oldestCrateDate: null,
        totalPaid: 0,
        totalAmount: 0,
      }
    }
    map[key].totalAmount += Number(s.amount)
    map[key].totalPaid   += (paidBySale[s.id] || 0)
    map[key].owed        += saleBalance
    map[key].eggs        += s.crates * CRATE_SIZE + s.singles
    map[key].sales.push({ ...s, balance: saleBalance, paid: paidBySale[s.id] || 0 })
    if (s.date < map[key].oldest) map[key].oldest = s.date
    const net = (s.crates_loaned || 0) - (s.crates_returned || 0)
    if (net > 0) {
      map[key].cratesOut += net
      if (!map[key].oldestCrateDate || s.date < map[key].oldestCrateDate)
        map[key].oldestCrateDate = s.date
    }
  }
  // Only include debtors who still owe something
  return Object.values(map).filter(d => d.owed > 0).sort((a, b) => (a.oldest > b.oldest ? 1 : -1))
}

export default function CreditTracker({ sales, payments = [], onMarkPaid, onReturnCrates, onAddPayment, showToast }) {
  const debtors   = useMemo(() => computeDebtors(sales, payments), [sales, payments])
  const totalDebt = debtors.reduce((s, d) => s + d.owed, 0)

  // State per debtor key
  const [state, setState] = useState({}) // key -> { crateOpen, payOpen, crateQty, payAmt, payNotes, saving }

  function getS(key) {
    return state[key] || { crateOpen: false, payOpen: false, crateQty: '', payAmt: '', payNotes: '', saving: false }
  }
  function setS(key, patch) {
    setState(s => ({ ...s, [key]: { ...getS(key), ...patch } }))
  }

  async function submitReturn(debtor) {
    const key = debtor.name.toLowerCase()
    const qty = parseInt(getS(key).crateQty, 10)
    if (isNaN(qty) || qty <= 0) return showToast('Enter a valid crate count')
    if (qty > debtor.cratesOut) return showToast(`Only ${debtor.cratesOut} crates out`)
    setS(key, { saving: true })
    try {
      let remaining = qty
      const sorted = [...debtor.sales].sort((a, b) => (a.date < b.date ? 1 : -1))
      for (const s of sorted) {
        if (remaining <= 0) break
        const net = (s.crates_loaned || 0) - (s.crates_returned || 0)
        if (net <= 0) continue
        const apply = Math.min(remaining, net)
        await onReturnCrates(s.id, (s.crates_returned || 0) + apply)
        remaining -= apply
      }
      showToast(`${qty} crate${qty !== 1 ? 's' : ''} returned`)
      setS(key, { saving: false, crateOpen: false, crateQty: '' })
    } catch (e) {
      showToast('Error: ' + e.message)
      setS(key, { saving: false })
    }
  }

  async function submitPartialPayment(debtor) {
    const key = debtor.name.toLowerCase()
    const s   = getS(key)
    const amt = Number(s.payAmt)
    if (!amt || amt <= 0) return showToast('Enter a valid amount')
    if (amt > debtor.owed)  return showToast(`Max ₦${debtor.owed.toLocaleString()} outstanding`)
    setS(key, { saving: true })
    const method = s.payMethod || 'Cash'
    const noteText = [method, s.payNotes.trim()].filter(Boolean).join(' - ')
    try {
      // Distribute payment across oldest unpaid sales first
      let remaining = amt
      const sorted = [...debtor.sales].sort((a, b) => (a.date > b.date ? 1 : -1))
      for (const sale of sorted) {
        if (remaining <= 0) break
        if (sale.balance <= 0) continue
        const apply = Math.min(remaining, sale.balance)
        await onAddPayment({
          sale_id: sale.id,
          amount:  apply,
          date:    todayISO(),
          notes:   noteText || null,
        })
        remaining -= apply
      }
      showToast(`${method} payment of ${fmtNaira(amt)} recorded`)
      setS(key, { saving: false, payOpen: false, payAmt: '', payNotes: '', payMethod: 'Cash' })
    } catch (e) {
      showToast('Error: ' + e.message)
      setS(key, { saving: false })
    }
  }

  if (!debtors.length) return (
    <div
      className="mx-4"
      style={{
        background: '#162010',
        border: '1px solid #2D4020',
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <CheckCircle size={36} style={{ margin: '0 auto 12px', color: '#9FD46A' }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>All clear!</p>
      <p style={{ fontSize: 13, color: '#4A6336', marginTop: 4 }}>No outstanding balances.</p>
    </div>
  )

  return (
    <div className="mx-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary banner */}
      <div
        style={{
          background: 'rgba(220,60,40,0.08)',
          border: '1px solid rgba(220,60,40,0.2)',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} style={{ color: '#F07060' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F07060' }}>
            {debtors.length} debtor{debtors.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: '#F07060', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Total owed</p>
          <p className="num" style={{ fontSize: 20, fontWeight: 700, color: '#F07060' }}>{fmtNaira(totalDebt)}</p>
        </div>
      </div>

      {/* Overdue legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingLeft: 2 }}>
        <span style={{ fontSize: 10, color: '#4A6336', fontWeight: 500 }}>Age:</span>
        {[['badge-green', '< 3 days'], ['badge-yellow', '3-7 days'], ['badge-red', '7+ days']].map(([cls, lbl]) => (
          <span key={cls} className={cls}>{lbl}</span>
        ))}
      </div>

      {/* Debtor cards */}
      {debtors.map(d => {
        const { cls, label, tier } = overdueInfo(d.oldest)
        const crateAlert = crateOverdueInfo(d.oldestCrateDate)
        const key = d.name.toLowerCase()
        const s = getS(key)
        const pctPaid = d.totalAmount > 0 ? Math.round((d.totalPaid / d.totalAmount) * 100) : 0

        return (
          <div
            key={key}
            style={{
              background: '#162010',
              border: `1px solid ${tier === 'alert' ? 'rgba(220,60,40,0.3)' : tier === 'warn' ? 'rgba(224,160,48,0.3)' : '#2D4020'}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {/* Main info */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#F0EDE8' }}>{d.name}</span>
                    <span className={cls}>{label}</span>
                    {crateAlert && <span className="badge-red pulse">{crateAlert.label}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#4A6336' }}>
                    <span>Since {fmtDate(d.oldest)}</span>
                    <span>·</span>
                    <span className="num">{d.eggs.toLocaleString()} eggs</span>
                    <span>·</span>
                    <span>{d.sales.length} sale{d.sales.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Partial payment progress */}
                  {d.totalPaid > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: '#6A806A' }}>Paid so far: <span className="num" style={{ color: '#9FD46A' }}>{fmtNaira(d.totalPaid)}</span></span>
                        <span className="num" style={{ fontSize: 10, color: '#9FD46A', fontWeight: 600 }}>{pctPaid}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pctPaid}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Crate debt */}
                  {d.cratesOut > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Package size={12} style={{ color: '#E8B75A' }} />
                      <span style={{ fontSize: 11, color: '#E8B75A', fontWeight: 500 }}>
                        {d.cratesOut} crate{d.cratesOut !== 1 ? 's' : ''} with buyer
                      </span>
                      <button
                        onClick={() => setS(key, { crateOpen: !s.crateOpen, payOpen: false })}
                        style={{ fontSize: 11, color: '#9FD46A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}
                      >
                        Log Return
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: amount + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 9, color: '#F07060', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Owes</p>
                    <p className="num" style={{ fontSize: 18, fontWeight: 700, color: '#F07060' }}>{fmtNaira(d.owed)}</p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <button
                      onClick={() => setS(key, { payOpen: !s.payOpen, crateOpen: false })}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(122,181,72,0.3)',
                        background: s.payOpen ? 'rgba(122,181,72,0.15)' : 'rgba(122,181,72,0.08)',
                        color: '#9FD46A',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                    >
                      <CreditCard size={11} />
                      Part Pay
                      {s.payOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    <button
                      onClick={async () => {
                        if (!window.confirm(`Mark ALL credit sales for ${d.name} as fully paid?`)) return
                        for (const sale of d.sales) await onMarkPaid(sale.id)
                        showToast(`${d.name} fully paid`)
                      }}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #7AB548, #5A9430)',
                        color: '#0E1A0A',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(90,148,48,0.3)',
                      }}
                    >
                      <PackageCheck size={11} />
                      Fully Paid
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Partial payment expander */}
            {s.payOpen && (
              <div
                className="slide-up"
                style={{
                  borderTop: '1px solid rgba(122,181,72,0.15)',
                  background: 'rgba(122,181,72,0.04)',
                  padding: '14px 16px',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9FD46A', marginBottom: 10 }}>
                  Record Partial Payment
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label className="label">Amount received (₦)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`Max ${fmtNaira(d.owed)}`}
                      value={s.payAmt}
                      onChange={e => setS(key, { payAmt: e.target.value })}
                      className="field"
                      style={{ fontSize: 16 }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Payment method</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { val: 'Cash',     emoji: '💵' },
                        { val: 'Transfer', emoji: '📲' },
                        { val: 'Other',    emoji: '•••' },
                      ].map(({ val, emoji }) => {
                        const active = (s.payMethod || 'Cash') === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setS(key, { payMethod: val })}
                            style={{
                              flex: 1,
                              padding: '9px 0',
                              borderRadius: 10,
                              border: active ? 'none' : '1px solid #2D4020',
                              background: active
                                ? 'linear-gradient(135deg, #7AB548, #5A9430)'
                                : '#1C2A14',
                              color: active ? '#0E1A0A' : '#4A6336',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <span style={{ fontSize: val === 'Other' ? 11 : 14 }}>{emoji}</span>
                            {val}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="label">Note (optional)</label>
                    <input
                      type="text"
                      placeholder={(s.payMethod || 'Cash') === 'Transfer' ? 'e.g. GTBank ref 123' : 'e.g. Paid at farm'}
                      value={s.payNotes}
                      onChange={e => setS(key, { payNotes: e.target.value })}
                      className="field"
                      style={{ fontSize: 16 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => submitPartialPayment(d)}
                      disabled={s.saving}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #7AB548, #5A9430)',
                        color: '#0E1A0A',
                        border: 'none',
                        borderRadius: 12,
                        padding: '11px 0',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: s.saving ? 0.6 : 1,
                        boxShadow: '0 4px 12px rgba(90,148,48,0.3)',
                      }}
                    >
                      {s.saving ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                      Save Payment
                    </button>
                    <button
                      onClick={() => setS(key, { payOpen: false, payAmt: '', payNotes: '' })}
                      style={{
                        background: '#1C2A14',
                        border: '1px solid #2D4020',
                        borderRadius: 12,
                        padding: '11px 14px',
                        fontSize: 12,
                        color: '#4A6336',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Crate return expander */}
            {d.cratesOut > 0 && s.crateOpen && (
              <div
                className="slide-up"
                style={{
                  borderTop: '1px solid rgba(224,160,48,0.2)',
                  background: 'rgba(224,160,48,0.04)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Package size={14} style={{ color: '#E8B75A', flexShrink: 0 }} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={d.cratesOut}
                  placeholder={`Max ${d.cratesOut}`}
                  value={s.crateQty}
                  onChange={e => setS(key, { crateQty: e.target.value })}
                  style={{
                    flex: 1,
                    background: '#1C2A14',
                    border: '1px solid rgba(224,160,48,0.3)',
                    borderRadius: 10,
                    padding: '9px 12px',
                    fontSize: 16,
                    color: '#F0EDE8',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => submitReturn(d)}
                  disabled={s.saving}
                  style={{
                    background: 'linear-gradient(135deg, #E0A030, #B07820)',
                    color: '#0E1A0A',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                    opacity: s.saving ? 0.6 : 1,
                  }}
                >
                  {s.saving ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
                  Log Return
                </button>
                <button
                  onClick={() => setS(key, { crateOpen: false })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6336', padding: 4, fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
