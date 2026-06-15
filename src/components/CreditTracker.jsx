import { useState, useMemo } from 'react'

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

function agingLabel(sale) {
  const days = Math.floor((Date.now() - new Date(sale.date)) / 86400000)
  if (days <= 7)  return { label: `${days}d`,          color: '#10B981', bg: '#D1FAE5', urgent: false }
  if (days <= 14) return { label: `${days}d`,          color: '#F59E0B', bg: '#FEF3C7', urgent: false }
  return           { label: `${days}d overdue`,        color: '#EF4444', bg: '#FEE2E2', urgent: true  }
}

export default function CreditTracker({
  sales, onMarkPaid, payments = [], onAddPayment, onDeletePayment, onReturnCrates, isAdmin
}) {
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [partialCustomer, setPartialCustomer]   = useState(null)
  const [partialForm, setPartialForm] = useState({ amount: '', method: 'Cash', notes: '' })
  const [saving, setSaving]       = useState(false)
  const [markingPaid, setMarkingPaid] = useState(null)
  const [deletingPayment, setDeletingPayment] = useState(null)
  const [returningSaleId, setReturningSaleId] = useState(null)
  const [returnQty, setReturnQty]             = useState('')
  const [returning, setReturning]             = useState(false)
  const [search, setSearch]                   = useState('')
  const [activeFilter, setActiveFilter]       = useState('outstanding')

  const paidBySaleMap = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      map[p.sale_id] = (map[p.sale_id] || 0) + parseFloat(p.amount || 0)
    })
    return map
  }, [payments])

  const debtors = useMemo(() => {
    const creditSales = sales.filter(s => s.payment_status === 'Credit' && !s.paid_at)
    const map = {}
    creditSales.forEach(s => {
      const name = s.customer_name || 'Unknown'
      if (!map[name]) map[name] = { name, sales: [], total: 0, oldest: s.date }
      map[name].sales.push(s)
      map[name].total += parseFloat(s.amount || 0)
      if (s.date < map[name].oldest) map[name].oldest = s.date
    })
    return Object.values(map).sort((a, b) => new Date(a.oldest) - new Date(b.oldest))
  }, [sales])

  const filteredDebtors = useMemo(() => {
    let result = debtors
    const q = search.toLowerCase().trim()
    if (q) result = result.filter(d => d.name.toLowerCase().includes(q))
    if (activeFilter === 'outstanding') result = result.filter(d => {
      const paid = d.sales.reduce((s, sale) => s + (paidBySaleMap[sale.id] || 0), 0)
      return d.total - paid > 0
    })
    if (activeFilter === 'partial') result = result.filter(d => {
      const paid = d.sales.reduce((s, sale) => s + (paidBySaleMap[sale.id] || 0), 0)
      return paid > 0 && paid < d.total
    })
    if (activeFilter === 'overdue') result = result.filter(d =>
      Math.floor((Date.now() - new Date(d.oldest)) / 86400000) > 14
    )
    return result
  }, [debtors, search, activeFilter, paidBySaleMap])

  const totalOutstanding = useMemo(() => {
    return debtors.reduce((sum, d) => {
      const totalPaid = d.sales.reduce((s, sale) => s + (paidBySaleMap[sale.id] || 0), 0)
      return sum + Math.max(0, d.total - totalPaid)
    }, 0)
  }, [debtors, paidBySaleMap])

  // All customers with outstanding crates (regardless of payment status)
  const cratesOutCustomers = useMemo(() => {
    const map = {}
    sales.forEach(s => {
      const loaned = parseInt(s.crates_loaned || 0)
      const returned = parseInt(s.crates_returned || 0)
      const outstanding = loaned - returned
      if (outstanding <= 0) return
      const name = s.customer_name || 'Unknown'
      if (!map[name]) map[name] = { name, sales: [], totalOut: 0 }
      map[name].sales.push({ ...s, outstanding })
      map[name].totalOut += outstanding
    })
    return Object.values(map).sort((a, b) => b.totalOut - a.totalOut)
  }, [sales])

  function paidForSale(saleId) {
    return payments
      .filter(p => p.sale_id === saleId)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  }

  function paidForCustomer(customerName) {
    const saleIds = new Set(
      sales.filter(s => (s.customer_name || 'Unknown') === customerName).map(s => s.id)
    )
    return payments
      .filter(p => saleIds.has(p.sale_id))
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  }

  function paymentsForCustomer(customerName) {
    const saleIds = new Set(
      sales.filter(s => (s.customer_name || 'Unknown') === customerName).map(s => s.id)
    )
    return payments.filter(p => saleIds.has(p.sale_id))
  }

  async function handleMarkPaid(saleId) {
    setMarkingPaid(saleId)
    await onMarkPaid(saleId)
    setMarkingPaid(null)
  }

  async function handlePartialSubmit(debtor) {
    if (!partialForm.amount || parseFloat(partialForm.amount) <= 0) return
    setSaving(true)
    const notes = partialForm.method + (partialForm.notes ? ` - ${partialForm.notes}` : '')
    let remaining = parseFloat(partialForm.amount)
    const sorted = [...debtor.sales].sort((a, b) => new Date(a.date) - new Date(b.date))
    for (const sale of sorted) {
      if (remaining <= 0) break
      const alreadyPaid = paidForSale(sale.id)
      const owed = parseFloat(sale.amount) - alreadyPaid
      if (owed <= 0) continue
      const applying = Math.min(owed, remaining)
      const result = await onAddPayment({ sale_id: sale.id, amount: applying, date: new Date().toISOString().slice(0,10), notes })
      if (result?.error) break
      remaining -= applying
    }
    setSaving(false)
    setPartialCustomer(null)
    setPartialForm({ amount: '', method: 'Cash', notes: '' })
  }

  async function handleDeletePayment(paymentId) {
    setDeletingPayment(paymentId)
    await onDeletePayment(paymentId)
    setDeletingPayment(null)
  }

  async function handleCrateReturn(sale) {
    const qty = parseInt(returnQty)
    const outstanding = parseInt(sale.crates_loaned || 0) - parseInt(sale.crates_returned || 0)
    if (!qty || qty < 1)     return
    if (qty > outstanding)   return
    setReturning(true)
    await onReturnCrates(sale.id, (parseInt(sale.crates_returned) || 0) + qty)
    setReturningSaleId(null)
    setReturnQty('')
    setReturning(false)
  }

  function buildWhatsApp(debtor) {
    const salesList = debtor.sales.map(s =>
      `• ${new Date(s.date).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}: ${fmt(s.amount)}`
    ).join('\n')
    const msg = encodeURIComponent(
      `Hello ${debtor.name},\n\nThis is a reminder that you have an outstanding balance of *${fmt(debtor.total)}* for eggs purchased from ROKDIV Farm.\n\nDetails:\n${salesList}\n\nKindly settle at your earliest convenience. Thank you!`
    )
    return `https://wa.me/?text=${msg}`
  }

  // Don't early-return when no debtors — crates may still be outstanding
  // for cash sales that are paid but crates not yet returned

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* All clear notice - shown when no money owed but may still have crates out */}
      {debtors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px 16px', color: '#9CA3AF' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
          <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px', margin: '0 0 4px' }}>No outstanding balances</p>
          <p style={{ fontSize: '12px', margin: 0 }}>All credit accounts are settled</p>
        </div>
      )}

      {/* Summary row - only shown when there are debtors */}
      {debtors.length > 0 && <div style={{
        background: '#FEF3C7', borderRadius: '12px', padding: '12px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', border: '1px solid #FDE68A'
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Outstanding
          </p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#B45309' }}>{fmt(totalOutstanding)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#92400E' }}>
            {debtors.length} debtor{debtors.length !== 1 ? 's' : ''}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#B45309' }}>
            {debtors.filter(d => Math.floor((Date.now() - new Date(d.oldest)) / 86400000) > 14).length} overdue &gt;14 days
          </p>
        </div>
      </div>}

      {/* Search box */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#9CA3AF' }}>🔍</span>
        <input
          type="text"
          placeholder="Search debtors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 34px',
            borderRadius: '10px', border: '1.5px solid #E5E7EB',
            fontSize: '14px', color: '#111827', background: 'white',
            outline: 'none', boxSizing: 'border-box'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px' }}>
            ×
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {[
          { key: 'all',         label: 'All' },
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'partial',     label: 'Partially Paid' },
          { key: 'overdue',     label: 'Overdue >14d' },
        ].map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
            padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: `1.5px solid ${activeFilter === f.key ? '#4F6EF7' : '#E5E7EB'}`,
            background: activeFilter === f.key ? '#EEF1FF' : 'white',
            color: activeFilter === f.key ? '#4F6EF7' : '#6B7280',
            cursor: 'pointer'
          }}>{f.label}</button>
        ))}
      </div>

      {/* No results */}
      {filteredDebtors.length === 0 && debtors.length > 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '13px' }}>
          No debtors match your search or filter.
        </div>
      )}

      {/* Debtor cards */}
      {filteredDebtors.map(debtor => {
        const totalPaid  = paidForCustomer(debtor.name)
        const balance    = debtor.total - totalPaid
        const pct        = debtor.total > 0 ? Math.min(100, (totalPaid / debtor.total) * 100) : 0
        const isExpanded = expandedCustomer === debtor.name
        const isPartialOpen = partialCustomer === debtor.name
        const customerPayments = paymentsForCustomer(debtor.name)

        return (
          <div key={debtor.name} style={{
            background: 'white', borderRadius: '14px', marginBottom: '10px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden'
          }}>
            {/* Card header */}
            <div style={{ padding: '14px 14px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <button
                    onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontWeight: 700, fontSize: '15px', color: '#111827',
                      textDecoration: 'underline', textDecorationStyle: 'dotted',
                      textDecorationColor: '#9CA3AF', textUnderlineOffset: '3px'
                    }}>
                    {debtor.name}
                  </button>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                    {debtor.sales.length} sale{debtor.sales.length !== 1 ? 's' : ''} · since {new Date(debtor.oldest).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#EF4444' }}>{fmt(balance)}</p>
                  {totalPaid > 0 && (
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#10B981' }}>{fmt(totalPaid)} paid</p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {pct > 0 && (
                <div style={{ height: '4px', borderRadius: '2px', background: '#F3F4F6', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setPartialCustomer(isPartialOpen ? null : debtor.name)}
                  style={actionBtn('#4F6EF7')}>
                  💰 Part Pay
                </button>
                <a href={buildWhatsApp(debtor)} target="_blank" rel="noreferrer"
                  style={{ ...actionBtn('#25D366'), textDecoration: 'none', display: 'inline-block' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Remind
                  </span>
                </a>
                {/* Return Crates button - only shown if any sale has outstanding crates */}
                {debtor.sales.some(s => parseInt(s.crates_loaned || 0) - parseInt(s.crates_returned || 0) > 0) && (
                  <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                    style={actionBtn('#D97706')}>
                    📦 Return Crates
                  </button>
                )}
              </div>
            </div>

            {/* Partial payment form */}
            {isPartialOpen && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                  Record partial payment
                </p>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {['Cash','Transfer','Other'].map(m => (
                    <button key={m} onClick={() => setPartialForm(f => ({ ...f, method: m }))}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: `1.5px solid ${partialForm.method === m ? '#4F6EF7' : '#E5E7EB'}`,
                        background: partialForm.method === m ? '#EEF1FF' : 'white',
                        color: partialForm.method === m ? '#4F6EF7' : '#6B7280',
                        cursor: 'pointer'
                      }}>
                      {m === 'Cash' ? '💵' : m === 'Transfer' ? '📲' : '•••'} {m}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={lblStyle}>Amount (₦)</label>
                    <input type="number" placeholder="0" value={partialForm.amount}
                      onChange={e => setPartialForm(f => ({ ...f, amount: e.target.value }))}
                      style={inpStyle} />
                  </div>
                  <div>
                    <label style={lblStyle}>Note (optional)</label>
                    <input type="text" placeholder="e.g. GTBank" value={partialForm.notes}
                      onChange={e => setPartialForm(f => ({ ...f, notes: e.target.value }))}
                      style={inpStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handlePartialSubmit(debtor)} disabled={saving}
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#4F6EF7', color: 'white',
                      border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Record Payment'}
                  </button>
                  <button onClick={() => setPartialCustomer(null)}
                    style={{ padding: '9px 14px', borderRadius: '8px', background: 'white',
                      border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600,
                      fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expanded sale list */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #F3F4F6' }}>
                {/* Payment history - admin can delete entries */}
                {customerPayments.length > 0 && (
                  <div style={{ padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Payment history
                    </p>
                    {customerPayments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{fmt(p.amount)}</span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                            {new Date(p.date).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                            {p.notes ? ` · ${p.notes}` : ''}
                          </span>
                        </div>
                        {/* Only admin sees delete on payment history */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            disabled={deletingPayment === p.id}
                            title="Delete payment record"
                            style={{
                              background: '#FEE2E2', border: 'none', cursor: 'pointer',
                              color: '#EF4444', fontSize: '12px', padding: '3px 7px',
                              borderRadius: '5px', fontWeight: 700
                            }}>
                            {deletingPayment === p.id ? '…' : '×'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Individual sale lines */}
                {debtor.sales.map(sale => {
                  const salePaid   = paidForSale(sale.id)
                  const saleBalance = parseFloat(sale.amount) - salePaid
                  const aging      = agingLabel(sale)
                  return (
                    <div key={sale.id} style={{
                      padding: '10px 14px', borderBottom: '1px solid #F9FAFB',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                            borderRadius: '20px', background: aging.bg, color: aging.color
                          }}>{aging.label}</span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            {new Date(sale.date).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                          {sale.crates} crate{parseInt(sale.crates) !== 1 ? 's' : ''}
                          {salePaid > 0 && (
                            <span style={{ color: '#10B981', marginLeft: '6px' }}>· {fmt(salePaid)} paid</span>
                          )}
                          {parseInt(sale.crates_loaned || 0) > 0 && (
                            <span style={{ color: '#D97706', marginLeft: '6px' }}>
                              · 📦 {parseInt(sale.crates_loaned) - parseInt(sale.crates_returned || 0)} crates out
                            </span>
                          )}
                        </p>
                        {/* Crate return form - shows inline when card is expanded */}
                        {parseInt(sale.crates_loaned || 0) - parseInt(sale.crates_returned || 0) > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                              📦 Return:
                            </span>
                            <input
                              type="number" inputMode="numeric"
                              placeholder={`max ${parseInt(sale.crates_loaned) - parseInt(sale.crates_returned || 0)}`}
                              value={returningSaleId === sale.id ? returnQty : ''}
                              onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                              style={{ width: 90, padding: '4px 8px', borderRadius: '7px',
                                border: '1.5px solid #D97706', fontSize: '12px', outline: 'none',
                                background: '#FFFBEB' }}
                            />
                            <button
                              onClick={() => handleCrateReturn(sale)}
                              disabled={returning || returningSaleId !== sale.id || !returnQty}
                              style={{ padding: '4px 10px', borderRadius: '7px',
                                background: returning ? '#F3F4F6' : '#D97706',
                                color: returning ? '#9CA3AF' : 'white',
                                border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                              {returning && returningSaleId === sale.id ? '...' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: saleBalance > 0 ? '#EF4444' : '#10B981' }}>
                          {fmt(saleBalance > 0 ? saleBalance : parseFloat(sale.amount))}
                          {saleBalance <= 0 && <span style={{ fontSize: '11px', marginLeft: '4px' }}>✓</span>}
                        </span>
                        {/* Mark paid - all users can do this */}
                        {saleBalance > 0 && (
                          <button onClick={() => handleMarkPaid(sale.id)} disabled={markingPaid === sale.id}
                            style={{
                              padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                              background: '#D1FAE5', color: '#065F46', border: 'none', cursor: 'pointer'
                            }}>
                            {markingPaid === sale.id ? '...' : 'Paid ✓'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Non-admin notice inside expanded view */}
                {!isAdmin && (
                  <div style={{ padding: '8px 14px', background: '#F9FAFB' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      🔒 Only the admin can delete payment records.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {/* ── Crates Out Section ─────────────────────────────── */}
      {cratesOutCustomers.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px' }}>📦</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Crates Still Out</span>
            <span style={{ fontSize: '11px', background: '#FFFBEB', color: '#D97706',
              border: '1px solid #FDE68A', borderRadius: '20px', padding: '2px 8px', fontWeight: 600 }}>
              {cratesOutCustomers.reduce((s, c) => s + c.totalOut, 0)} total
            </span>
          </div>

          {cratesOutCustomers.map(customer => (
            <div key={customer.name} style={{
              background: 'white', borderRadius: '14px', marginBottom: '10px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{customer.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#D97706' }}>
                    {customer.totalOut} crate{customer.totalOut !== 1 ? 's' : ''} out
                  </span>
                </div>

                {customer.sales.map(sale => (
                  <div key={sale.id} style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(sale.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      {' · '}loaned {sale.crates_loaned}, returned {sale.crates_returned || 0},
                      {' '}
                      <span style={{ color: '#D97706', fontWeight: 600 }}>{sale.outstanding} still out</span>
                    </p>
                    {/* Inline return form */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Return:</span>
                      <input
                        type="number" inputMode="numeric"
                        placeholder={`max ${sale.outstanding}`}
                        value={returningSaleId === sale.id ? returnQty : ''}
                        onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                        style={{ width: 90, padding: '5px 8px', borderRadius: '7px',
                          border: '1.5px solid #D97706', fontSize: '12px', outline: 'none',
                          background: '#FFFBEB' }}
                      />
                      <button
                        onClick={() => handleCrateReturn(sale)}
                        disabled={returning || returningSaleId !== sale.id || !returnQty}
                        style={{ padding: '5px 12px', borderRadius: '7px',
                          background: (returning && returningSaleId === sale.id) ? '#F3F4F6' : '#D97706',
                          color: (returning && returningSaleId === sale.id) ? '#9CA3AF' : 'white',
                          border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        {returning && returningSaleId === sale.id ? '...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const actionBtn = (color) => ({
  padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
  background: `${color}12`, color, border: `1px solid ${color}30`,
  cursor: 'pointer'
})
const lblStyle = {
  display: 'block', fontSize: '10px', fontWeight: 600,
  color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
}
const inpStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '1.5px solid #E5E7EB', fontSize: '13px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: 'white'
}