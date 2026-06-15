import { useState, useMemo } from 'react'

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

function agingLabel(date) {
  const days = Math.floor((Date.now() - new Date(date)) / 86400000)
  if (days <= 7)  return { label: `${days}d`, color: '#10B981', bg: '#D1FAE5' }
  if (days <= 14) return { label: `${days}d`, color: '#F59E0B', bg: '#FEF3C7' }
  return           { label: `${days}d overdue`, color: '#EF4444', bg: '#FEE2E2' }
}

export default function CreditTracker({
  sales, onMarkPaid, payments = [], onAddPayment, onDeletePayment, onReturnCrates, isAdmin
}) {
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [partialCustomer, setPartialCustomer]   = useState(null)
  const [partialForm, setPartialForm]           = useState({ amount: '', method: 'Cash', notes: '' })
  const [saving, setSaving]                     = useState(false)
  const [markingPaid, setMarkingPaid]           = useState(null)
  const [deletingPayment, setDeletingPayment]   = useState(null)
  const [returningSaleId, setReturningSaleId]   = useState(null)
  const [returnQty, setReturnQty]               = useState('')
  const [returning, setReturning]               = useState(false)
  const [search, setSearch]                     = useState('')
  const [activeFilter, setActiveFilter]         = useState('outstanding')
  const [activeSection, setActiveSection]       = useState('money')

  // ── Payment map ──────────────────────────────────────────────────────────
  const paidBySaleMap = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      map[p.sale_id] = (map[p.sale_id] || 0) + parseFloat(p.amount || 0)
    })
    return map
  }, [payments])

  // ── All debtors (credit + settled credit) ────────────────────────────────
  const allDebtors = useMemo(() => {
    const creditSales = sales.filter(s =>
      s.payment_status === 'Credit' || (s.payment_status === 'Paid' && s.paid_at)
    )
    const map = {}
    creditSales.forEach(s => {
      const name = s.customer_name || 'Unknown'
      if (!map[name]) map[name] = { name, sales: [], originalTotal: 0, oldest: s.date }
      map[name].sales.push(s)
      map[name].originalTotal += parseFloat(s.amount || 0)
      if (s.date < map[name].oldest) map[name].oldest = s.date
    })
    return Object.values(map).map(d => {
      const totalPaid = d.sales.reduce((s, sale) => s + (paidBySaleMap[sale.id] || 0), 0)
      const remaining = Math.max(0, d.originalTotal - totalPaid)
      const isSettled = d.sales.every(s => s.payment_status === 'Paid') || remaining === 0
      return { ...d, totalPaid, remaining, isSettled }
    }).sort((a, b) => new Date(a.oldest) - new Date(b.oldest))
  }, [sales, paidBySaleMap])

  // ── Hero stats ───────────────────────────────────────────────────────────
  const totalOutstanding = useMemo(
    () => allDebtors.reduce((s, d) => s + d.remaining, 0),
    [allDebtors]
  )
  const outstandingDebtors = allDebtors.filter(d => !d.isSettled)
  const overdueCount = outstandingDebtors.filter(d =>
    Math.floor((Date.now() - new Date(d.oldest)) / 86400000) > 14
  ).length

  // ── Crates out ───────────────────────────────────────────────────────────
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

  const totalCratesOut = cratesOutCustomers.reduce((s, c) => s + c.totalOut, 0)

  // ── Filtered debtors ─────────────────────────────────────────────────────
  const filteredDebtors = useMemo(() => {
    let result = allDebtors
    const q = search.toLowerCase().trim()
    if (q) result = result.filter(d => d.name.toLowerCase().includes(q))
    if (activeFilter === 'outstanding') result = result.filter(d => !d.isSettled && d.remaining > 0)
    if (activeFilter === 'partial')     result = result.filter(d => d.totalPaid > 0 && d.remaining > 0)
    if (activeFilter === 'overdue')     result = result.filter(d =>
      !d.isSettled && Math.floor((Date.now() - new Date(d.oldest)) / 86400000) > 14
    )
    if (activeFilter === 'settled')     result = result.filter(d => d.isSettled)
    return result
  }, [allDebtors, search, activeFilter])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function paymentsForCustomer(name) {
    const saleIds = new Set(sales.filter(s => (s.customer_name||'Unknown') === name).map(s => s.id))
    return payments.filter(p => saleIds.has(p.sale_id))
  }

  async function handleMarkPaid(saleId) {
    setMarkingPaid(saleId)
    await onMarkPaid(saleId)
    setMarkingPaid(null)
  }

  async function handleMarkFullyPaid(debtor) {
    for (const sale of debtor.sales) {
      const alreadyPaid = paidBySaleMap[sale.id] || 0
      if (parseFloat(sale.amount) - alreadyPaid > 0) await handleMarkPaid(sale.id)
    }
  }

  async function handlePartialSubmit(debtor) {
    if (!partialForm.amount || parseFloat(partialForm.amount) <= 0) return
    setSaving(true)
    const notes = partialForm.method + (partialForm.notes ? ` - ${partialForm.notes}` : '')
    let remaining = parseFloat(partialForm.amount)
    const sorted = [...debtor.sales].sort((a, b) => new Date(a.date) - new Date(b.date))
    for (const sale of sorted) {
      if (remaining <= 0) break
      const alreadyPaid = paidBySaleMap[sale.id] || 0
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

  async function handleDeletePayment(id) {
    setDeletingPayment(id)
    await onDeletePayment(id)
    setDeletingPayment(null)
  }

  async function handleCrateReturn(sale) {
    const qty = parseInt(returnQty)
    const outstanding = parseInt(sale.crates_loaned||0) - parseInt(sale.crates_returned||0)
    if (!qty || qty < 1 || qty > outstanding) return
    setReturning(true)
    await onReturnCrates(sale.id, (parseInt(sale.crates_returned)||0) + qty)
    setReturningSaleId(null)
    setReturnQty('')
    setReturning(false)
  }

  function buildWhatsApp(debtor) {
    const list = debtor.sales.map(s =>
      `• ${new Date(s.date).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}: ${fmt(s.amount)}`
    ).join('\n')
    const msg = encodeURIComponent(
      `Hello ${debtor.name},\n\nThis is a reminder that you have an outstanding balance of *${fmt(debtor.remaining)}* for eggs purchased from ROKDIV Farm.\n\nDetails:\n${list}\n\nKindly settle at your earliest convenience. Thank you!`
    )
    return `https://wa.me/?text=${msg}`
  }

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Hero Tab Switcher ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div onClick={() => setActiveSection('money')} style={{
          background: activeSection === 'money' ? (totalOutstanding > 0 ? '#FEF3C7' : '#ECFDF5') : 'white',
          borderRadius: '14px', padding: '16px', cursor: 'pointer',
          border: activeSection === 'money'
            ? `2px solid ${totalOutstanding > 0 ? '#FCD34D' : '#6EE7B7'}`
            : '2px solid #F3F4F6',
          transition: 'all 0.15s'
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: totalOutstanding > 0 ? '#92400E' : '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💰 Outstanding
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '26px', fontWeight: 800, color: totalOutstanding > 0 ? '#B45309' : '#059669', lineHeight: 1.1 }}>
            {fmt(totalOutstanding)}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
            {outstandingDebtors.length} debtor{outstandingDebtors.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span style={{ color: '#EF4444', marginLeft: '4px' }}>· {overdueCount} overdue</span>}
          </p>
        </div>
        <div onClick={() => setActiveSection('crates')} style={{
          background: activeSection === 'crates' ? '#FFFBEB' : 'white',
          borderRadius: '14px', padding: '16px', cursor: 'pointer',
          border: activeSection === 'crates' ? '2px solid #FCD34D' : '2px solid #F3F4F6',
          transition: 'all 0.15s'
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📦 Crates Out
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '26px', fontWeight: 800, color: totalCratesOut > 0 ? '#D97706' : '#9CA3AF', lineHeight: 1.1 }}>
            {totalCratesOut}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
            {cratesOutCustomers.length} customer{cratesOutCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Crates section ──────────────────────────────────────────────── */}
      {activeSection === 'crates' && cratesOutCustomers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {cratesOutCustomers.map(customer => (
            <div key={customer.name} style={{ background: 'white', borderRadius: '12px', marginBottom: '8px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #FDE68A', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{customer.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#D97706' }}>{customer.totalOut} crate{customer.totalOut !== 1 ? 's' : ''} out</span>
                </div>
                {customer.sales.map(sale => (
                  <div key={sale.id} style={{ marginBottom: '8px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(sale.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      {' · '}loaned {sale.crates_loaned}, returned {sale.crates_returned || 0},{' '}
                      <span style={{ color: '#D97706', fontWeight: 600 }}>{sale.outstanding} still out</span>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Return:</span>
                      <input type="number" inputMode="numeric" placeholder={`max ${sale.outstanding}`}
                        value={returningSaleId === sale.id ? returnQty : ''}
                        onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                        style={{ width: 80, padding: '4px 8px', borderRadius: '7px', border: '1.5px solid #D97706', fontSize: '12px', outline: 'none', background: '#FFFBEB' }}
                      />
                      <button onClick={() => handleCrateReturn(sale)}
                        disabled={returning || returningSaleId !== sale.id || !returnQty}
                        style={{ padding: '4px 12px', borderRadius: '7px', background: '#D97706', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: (returning && returningSaleId === sale.id) ? 0.6 : 1 }}>
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

      {/* ── Money section ────────────────────────────────────────────────── */}
      {activeSection === 'money' && <>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#9CA3AF' }}>🔍</span>
        <input type="text" placeholder="Search debtors..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#111827', background: 'white', outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px' }}>×</button>
        )}
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', padding: '6px 0' }}>
        {[
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'partial',     label: 'Partial' },
          { key: 'overdue',     label: 'Overdue' },
          { key: 'settled',     label: 'Settled' },
          { key: 'all',         label: 'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: `1.5px solid ${activeFilter === f.key ? '#4F6EF7' : '#E5E7EB'}`,
            background: activeFilter === f.key ? '#EEF1FF' : '#F9FAFB',
            color: activeFilter === f.key ? '#4F6EF7' : '#9CA3AF',
            cursor: 'pointer'
          }}>{f.label}</button>
        ))}
      </div>

      {filteredDebtors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px' }}>
          {allDebtors.length === 0 ? 'No credit sales recorded yet.' : 'No debtors match your filter.'}
        </div>
      )}

      {/* ── Debtor cards ─────────────────────────────────────────────────── */}
      {filteredDebtors.map(debtor => {
        const isExpanded    = expandedCustomer === debtor.name
        const isPartialOpen = partialCustomer === debtor.name
        const pct = debtor.originalTotal > 0 ? Math.min(100, (debtor.totalPaid / debtor.originalTotal) * 100) : 0
        const customerPayments = paymentsForCustomer(debtor.name)
        const hasCratesOut = debtor.sales.some(s => parseInt(s.crates_loaned||0) - parseInt(s.crates_returned||0) > 0)

        return (
          <div key={debtor.name} style={{
            background: 'white', borderRadius: '14px', marginBottom: '12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            border: debtor.isSettled ? '1.5px solid #A7F3D0' : '1px solid #F3F4F6',
          }}>
            {/* ── Collapsed header ── */}
            <div style={{ padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pct > 0 ? '8px' : '10px' }}>
                <div>
                  <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '15px', color: '#111827', textAlign: 'left' }}>
                    {debtor.name}
                  </button>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                    {debtor.sales.length} sale{debtor.sales.length !== 1 ? 's' : ''} · {new Date(debtor.oldest).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {/* Balance hero */}
                {debtor.isSettled ? (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #A7F3D0' }}>
                    ✅ Settled
                  </span>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>{fmt(debtor.remaining)}</p>
                    {debtor.totalPaid > 0 && (
                      <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#10B981' }}>{fmt(debtor.totalPaid)} paid</p>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {pct > 0 && (
                <div style={{ height: '3px', borderRadius: '2px', background: '#F3F4F6', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: debtor.isSettled ? '#10B981' : '#4F6EF7', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              )}

              {/* Actions - primary solid, secondary text */}
              {!debtor.isSettled && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Primary actions - solid */}
                  <button onClick={() => setPartialCustomer(isPartialOpen ? null : debtor.name)}
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: '#4F6EF7', color: 'white', border: 'none', cursor: 'pointer' }}>
                    💰 Part Pay
                  </button>
                  <button onClick={() => handleMarkFullyPaid(debtor)}
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
                    ✅ Paid in Full
                  </button>
                  {/* Secondary actions - text style */}
                  <a href={buildWhatsApp(debtor)} target="_blank" rel="noreferrer"
                    style={{ fontSize: '12px', fontWeight: 600, color: '#25D366', textDecoration: 'none', padding: '7px 4px' }}>
                    📲 Remind
                  </a>
                  {hasCratesOut && (
                    <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                      style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 4px' }}>
                      📦 Crates
                    </button>
                  )}
                </div>
              )}
              {debtor.isSettled && hasCratesOut && (
                <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                  style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                  📦 Still has crates out - tap to return
                </button>
              )}
            </div>

            {/* Partial payment form */}
            {isPartialOpen && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>Record payment</p>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {['Cash', 'Transfer', 'Other'].map(m => (
                    <button key={m} onClick={() => setPartialForm(f => ({ ...f, method: m }))}
                      style={{ flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: `1.5px solid ${partialForm.method === m ? '#4F6EF7' : '#E5E7EB'}`, background: partialForm.method === m ? '#EEF1FF' : 'white', color: partialForm.method === m ? '#4F6EF7' : '#6B7280', cursor: 'pointer' }}>
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
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#4F6EF7', color: 'white', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Record Payment'}
                  </button>
                  <button onClick={() => setPartialCustomer(null)}
                    style={{ padding: '9px 14px', borderRadius: '8px', background: 'white', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #F3F4F6' }}>
                {/* Transaction summary */}
                <div style={{ padding: '12px 14px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Original Sale', value: fmt(debtor.originalTotal), color: '#111827' },
                      { label: 'Total Paid',    value: fmt(debtor.totalPaid),    color: '#10B981' },
                      { label: 'Outstanding',   value: debtor.remaining > 0 ? fmt(debtor.remaining) : '₦0 ✓', color: debtor.remaining > 0 ? '#EF4444' : '#059669' },
                    ].map((item, i) => (
                      <div key={item.label} style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment history */}
                {customerPayments.length > 0 && (
                  <div style={{ padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment History</p>
                    {customerPayments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{fmt(p.amount)}</span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                            {new Date(p.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            {p.notes ? ` · ${p.notes}` : ''}
                          </span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeletePayment(p.id)} disabled={deletingPayment === p.id}
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', fontWeight: 700 }}>
                            {deletingPayment === p.id ? '…' : '×'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sale lines with crate return */}
                {debtor.sales.map(sale => {
                  const salePaid     = paidBySaleMap[sale.id] || 0
                  const saleBalance  = Math.max(0, parseFloat(sale.amount) - salePaid)
                  const aging        = agingLabel(sale.date)
                  const cratesStillOut = parseInt(sale.crates_loaned||0) - parseInt(sale.crates_returned||0)
                  return (
                    <div key={sale.id} style={{ padding: '10px 14px', borderBottom: '1px solid #F9FAFB' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: aging.bg, color: aging.color }}>{aging.label}</span>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{new Date(sale.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                            {sale.crates} crate{parseInt(sale.crates) !== 1 ? 's' : ''}
                            {salePaid > 0 && <span style={{ color: '#10B981', marginLeft: '6px' }}>· {fmt(salePaid)} paid</span>}
                            {cratesStillOut > 0 && <span style={{ color: '#D97706', marginLeft: '6px' }}>· 📦 {cratesStillOut} crates out</span>}
                          </p>
                          {cratesStillOut > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Return:</span>
                              <input type="number" inputMode="numeric" placeholder={`max ${cratesStillOut}`}
                                value={returningSaleId === sale.id ? returnQty : ''}
                                onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                                style={{ width: 80, padding: '4px 8px', borderRadius: '7px', border: '1.5px solid #D97706', fontSize: '12px', outline: 'none', background: '#FFFBEB' }}
                              />
                              <button onClick={() => handleCrateReturn(sale)}
                                disabled={returning || returningSaleId !== sale.id || !returnQty}
                                style={{ padding: '4px 10px', borderRadius: '7px', background: '#D97706', color: 'white', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                {returning && returningSaleId === sale.id ? '...' : 'Confirm'}
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: saleBalance > 0 ? '#EF4444' : '#10B981' }}>
                            {fmt(saleBalance > 0 ? saleBalance : parseFloat(sale.amount))}{saleBalance <= 0 && ' ✓'}
                          </span>
                          {saleBalance > 0 && sale.payment_status === 'Credit' && (
                            <button onClick={() => handleMarkPaid(sale.id)} disabled={markingPaid === sale.id}
                              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#D1FAE5', color: '#065F46', border: 'none', cursor: 'pointer' }}>
                              {markingPaid === sale.id ? '...' : 'Paid ✓'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {!isAdmin && (
                  <div style={{ padding: '8px 14px', background: '#F9FAFB' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>🔒 Only admin can delete payment records.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
      </>}
  )
}

const lblStyle = {
  display: 'block', fontSize: '10px', fontWeight: 600,
  color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
}
const inpStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '1.5px solid #E5E7EB', fontSize: '13px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: 'white'
}