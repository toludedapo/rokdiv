import { useState, useMemo } from 'react'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', blue: '#0A84FF', gray: '#8E8E93' }
const TINT = { green: 'rgba(52,199,89,0.12)', red: 'rgba(255,69,58,0.12)', orange: 'rgba(255,159,10,0.12)', blue: 'rgba(10,132,255,0.12)' }

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

function agingLabel(date) {
  const days = Math.floor((Date.now() - new Date(date)) / 86400000)
  if (days === 0) return { label: 'Today', color: SIGNAL.blue, bg: TINT.blue }
  if (days <= 7)  return { label: `${days}d`, color: SIGNAL.green, bg: TINT.green }
  if (days <= 14) return { label: `${days}d`, color: SIGNAL.orange, bg: TINT.orange }
  return           { label: `${days}d`, color: SIGNAL.red, bg: TINT.red }
}

export default function CreditTracker({
  sales = [], onMarkPaid, payments = [], onAddPayment, onDeletePayment, onReturnCrates, isAdmin, customers = []
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

  const paidBySaleMap = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      map[p.sale_id] = (map[p.sale_id] || 0) + parseFloat(p.amount || 0)
    })
    return map
  }, [payments])

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
      const totalPaid = d.sales.reduce((s, sale) => {
        if (sale.payment_status === 'Paid') return s + parseFloat(sale.amount || 0)
        return s + (paidBySaleMap[sale.id] || 0)
      }, 0)
      const remaining = Math.max(0, d.originalTotal - totalPaid)
      const isSettled = d.sales.every(s => s.payment_status === 'Paid') || remaining === 0
      return { ...d, totalPaid, remaining, isSettled }
    }).sort((a, b) => new Date(a.oldest) - new Date(b.oldest))
  }, [sales, paidBySaleMap])

  const totalOutstanding = useMemo(
    () => allDebtors.reduce((s, d) => s + d.remaining, 0),
    [allDebtors]
  )
  const outstandingDebtors = allDebtors.filter(d => !d.isSettled)
  const overdueCount = outstandingDebtors.filter(d =>
    Math.floor((Date.now() - new Date(d.oldest)) / 86400000) > 14
  ).length

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
    const customer = customers.find(c => c.name.toLowerCase() === debtor.name.toLowerCase())
    if (customer?.whatsapp) {
      return `https://wa.me/${customer.whatsapp}?text=${encodeURIComponent(
        `Hello ${debtor.name},\n\nThis is a reminder that you have an outstanding balance of *${fmt(debtor.remaining)}* for eggs purchased from ROKDIV Farm.\n\nDetails:\n${list}\n\nKindly settle at your earliest convenience. Thank you!`
      )}`
    }
    return `https://wa.me/?text=${msg}`
  }

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* Hero tab switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div onClick={() => setActiveSection('money')} style={{
          ...cardSurface,
          background: activeSection === 'money' ? '#0D0D0D' : '#FFFFFF',
          cursor: 'pointer',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: activeSection === 'money' ? 'rgba(255,255,255,0.55)' : '#8E8E93' }}>
            Outstanding
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '26px', fontWeight: 500, letterSpacing: '-0.02em',
            color: activeSection === 'money' ? (totalOutstanding > 0 ? SIGNAL.red : SIGNAL.green) : (totalOutstanding > 0 ? SIGNAL.red : SIGNAL.green) }}>
            {fmt(totalOutstanding)}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: activeSection === 'money' ? 'rgba(255,255,255,0.45)' : '#8E8E93' }}>
            {outstandingDebtors.length} debtor{outstandingDebtors.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span style={{ color: SIGNAL.red, marginLeft: '4px' }}>· {overdueCount} overdue</span>}
          </p>
        </div>
        <div onClick={() => setActiveSection('crates')} style={{
          ...cardSurface,
          background: activeSection === 'crates' ? '#0D0D0D' : '#FFFFFF',
          cursor: 'pointer',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: activeSection === 'crates' ? 'rgba(255,255,255,0.55)' : '#8E8E93' }}>
            Crates out
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '26px', fontWeight: 500, letterSpacing: '-0.02em',
            color: totalCratesOut > 0 ? SIGNAL.orange : '#8E8E93' }}>
            {totalCratesOut}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: activeSection === 'crates' ? 'rgba(255,255,255,0.45)' : '#8E8E93' }}>
            {cratesOutCustomers.length} customer{cratesOutCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Crates section */}
      {activeSection === 'crates' && cratesOutCustomers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {cratesOutCustomers.map(customer => (
            <div key={customer.name} style={{ ...cardSurface, marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 500, fontSize: '14px', color: '#1C1C1E' }}>{customer.name}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: SIGNAL.orange }}>{customer.totalOut} crate{customer.totalOut !== 1 ? 's' : ''} out</span>
              </div>
              {customer.sales.map(sale => (
                <div key={sale.id} style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#8E8E93' }}>
                    {new Date(sale.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    {' · '}loaned {sale.crates_loaned}, returned {sale.crates_returned || 0},{' '}
                    <span style={{ color: SIGNAL.orange, fontWeight: 500 }}>{sale.outstanding} still out</span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: SIGNAL.orange, fontWeight: 500 }}>Return:</span>
                    <input type="number" inputMode="numeric" placeholder={`max ${sale.outstanding}`}
                      value={returningSaleId === sale.id ? returnQty : ''}
                      onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                      style={{ width: 80, padding: '4px 8px', borderRadius: '7px', border: `1.5px solid ${SIGNAL.orange}`, fontSize: '12px', outline: 'none', background: TINT.orange }}
                    />
                    <button onClick={() => handleCrateReturn(sale)}
                      disabled={returning || returningSaleId !== sale.id || !returnQty}
                      style={{ padding: '4px 12px', borderRadius: '7px', background: SIGNAL.orange, color: 'white', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: (returning && returningSaleId === sale.id) ? 0.6 : 1 }}>
                      {returning && returningSaleId === sale.id ? '…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Money section */}
      {activeSection === 'money' && <>

      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <input type="text" placeholder="Search debtors" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #D1D1D6', fontSize: '14px', color: '#1C1C1E', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', fontSize: '16px' }}>×</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {[
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'partial',     label: 'Partial' },
          { key: 'overdue',     label: 'Overdue' },
          { key: 'settled',     label: 'Settled' },
          { key: 'all',         label: 'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
            padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: 'none',
            background: activeFilter === f.key ? '#1C1C1E' : '#F2F2F7',
            color: activeFilter === f.key ? '#FFFFFF' : '#8E8E93',
            cursor: 'pointer'
          }}>{f.label}</button>
        ))}
      </div>

      {filteredDebtors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#8E8E93', fontSize: '13px' }}>
          {allDebtors.length === 0 ? 'No credit sales recorded yet.' : 'No debtors match your filter.'}
        </div>
      )}

      {filteredDebtors.map(debtor => {
        const isExpanded    = expandedCustomer === debtor.name
        const isPartialOpen = partialCustomer === debtor.name
        const pct = debtor.originalTotal > 0 ? Math.min(100, (debtor.totalPaid / debtor.originalTotal) * 100) : 0
        const customerPayments = paymentsForCustomer(debtor.name)
        const hasCratesOut = debtor.sales.some(s => parseInt(s.crates_loaned||0) - parseInt(s.crates_returned||0) > 0)

        return (
          <div key={debtor.name} style={{ ...cardSurface, marginBottom: '12px', padding: 0 }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pct > 0 ? '8px' : '10px' }}>
                <div>
                  <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 500, fontSize: '15px', color: '#1C1C1E', textAlign: 'left' }}>
                    {debtor.name}
                  </button>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>
                    {debtor.sales.length} sale{debtor.sales.length !== 1 ? 's' : ''} · {new Date(debtor.oldest).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    {!debtor.isSettled && (() => {
                      const days = Math.floor((Date.now() - new Date(debtor.oldest)) / 86400000)
                      if (days > 14) return <span style={{ marginLeft:'6px', color: SIGNAL.red, fontWeight:500 }}>· {days}d overdue</span>
                      if (days > 7)  return <span style={{ marginLeft:'6px', color: SIGNAL.orange, fontWeight:500 }}>· {days}d</span>
                      return null
                    })()}
                  </p>
                </div>
                {debtor.isSettled ? (
                  <span style={{ fontSize: '12px', fontWeight: 500, color: SIGNAL.green, background: TINT.green, padding: '4px 10px', borderRadius: '20px' }}>
                    Settled
                  </span>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: SIGNAL.red, letterSpacing: '-0.01em' }}>{fmt(debtor.remaining)}</p>
                    {debtor.totalPaid > 0 && (
                      <p style={{ margin: '1px 0 0', fontSize: '12px', color: SIGNAL.green }}>{fmt(debtor.totalPaid)} paid</p>
                    )}
                  </div>
                )}
              </div>

              {pct > 0 && (
                <div style={{ height: '3px', borderRadius: '2px', background: '#E5E5EA', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: debtor.isSettled ? SIGNAL.green : '#1C1C1E', borderRadius: '2px' }} />
                </div>
              )}

              {!debtor.isSettled && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setPartialCustomer(isPartialOpen ? null : debtor.name)} style={primaryBtnSmall}>
                    Part pay
                  </button>
                  <button onClick={() => handleMarkFullyPaid(debtor)} style={successBtnSmall}>
                    Paid in full
                  </button>
                  <a href={buildWhatsApp(debtor)} target="_blank" rel="noreferrer" style={textLink(SIGNAL.green)}>
                    Remind
                  </a>
                  {hasCratesOut && (
                    <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)} style={{ ...textLinkBtn(SIGNAL.orange) }}>
                      Crates
                    </button>
                  )}
                </div>
              )}
              {debtor.isSettled && hasCratesOut && (
                <button onClick={() => setExpandedCustomer(isExpanded ? null : debtor.name)} style={textLinkBtn(SIGNAL.orange)}>
                  Still has crates out — tap to return
                </button>
              )}
            </div>

            {isPartialOpen && (
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E5EA', background: '#F2F2F7' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 500, color: '#1C1C1E' }}>Record payment</p>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {['Cash', 'Transfer', 'Other'].map(m => (
                    <button key={m} onClick={() => setPartialForm(f => ({ ...f, method: m }))}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                        border: `1.5px solid ${partialForm.method === m ? '#1C1C1E' : '#D1D1D6'}`,
                        background: partialForm.method === m ? '#1C1C1E' : '#FFFFFF',
                        color: partialForm.method === m ? '#FFFFFF' : '#8E8E93', cursor: 'pointer'
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={fieldLabel}>Amount (₦)</label>
                    <input type="number" placeholder="0" value={partialForm.amount}
                      onChange={e => setPartialForm(f => ({ ...f, amount: e.target.value }))}
                      style={fieldInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Note (optional)</label>
                    <input type="text" placeholder="e.g. GTBank" value={partialForm.notes}
                      onChange={e => setPartialForm(f => ({ ...f, notes: e.target.value }))}
                      style={fieldInput} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handlePartialSubmit(debtor)} disabled={saving} style={{ ...primaryBtnSmall, flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving…' : 'Record payment'}
                  </button>
                  <button onClick={() => setPartialCustomer(null)} style={secondaryBtnSmall}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isExpanded && (
              <div style={{ borderTop: '0.5px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', background: '#F2F2F7', borderBottom: '0.5px solid #E5E5EA' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Original sale', value: fmt(debtor.originalTotal), color: '#1C1C1E' },
                      { label: 'Total paid',    value: fmt(debtor.totalPaid),    color: SIGNAL.green },
                      { label: 'Outstanding',   value: debtor.remaining > 0 ? fmt(debtor.remaining) : '₦0', color: debtor.remaining > 0 ? SIGNAL.red : SIGNAL.green },
                    ].map((item, i) => (
                      <div key={item.label} style={{ textAlign: 'center', borderLeft: i > 0 ? '0.5px solid #E5E5EA' : 'none' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#8E8E93' }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {customerPayments.length > 0 && (
                  <div style={{ padding: '10px 16px', background: '#F2F2F7', borderBottom: '0.5px solid #E5E5EA' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#8E8E93' }}>Payment history</p>
                    {customerPayments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '13px', color: '#1C1C1E', fontWeight: 500 }}>{fmt(p.amount)}</span>
                          <span style={{ fontSize: '12px', color: '#8E8E93', marginLeft: '6px' }}>
                            {new Date(p.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            {p.notes ? ` · ${p.notes}` : ''}
                          </span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeletePayment(p.id)} disabled={deletingPayment === p.id}
                            style={{ background: TINT.red, border: 'none', cursor: 'pointer', color: SIGNAL.red, fontSize: '12px', padding: '3px 7px', borderRadius: '5px', fontWeight: 500 }}>
                            {deletingPayment === p.id ? '…' : '×'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {debtor.sales.map(sale => {
                  const salePaid     = paidBySaleMap[sale.id] || 0
                  const saleBalance  = Math.max(0, parseFloat(sale.amount) - salePaid)
                  const aging        = agingLabel(sale.date)
                  const cratesStillOut = parseInt(sale.crates_loaned||0) - parseInt(sale.crates_returned||0)
                  return (
                    <div key={sale.id} style={{ padding: '10px 16px', borderBottom: '0.5px solid #F2F2F7' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: aging.bg, color: aging.color }}>{aging.label}</span>
                            <span style={{ fontSize: '12px', color: '#8E8E93' }}>{new Date(sale.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#8E8E93' }}>
                            {sale.crates} crate{parseInt(sale.crates) !== 1 ? 's' : ''}
                            {salePaid > 0 && <span style={{ color: SIGNAL.green, marginLeft: '6px' }}>· {fmt(salePaid)} paid</span>}
                            {cratesStillOut > 0 && <span style={{ color: SIGNAL.orange, marginLeft: '6px' }}>· {cratesStillOut} crates out</span>}
                          </p>
                          {cratesStillOut > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: SIGNAL.orange, fontWeight: 500 }}>Return:</span>
                              <input type="number" inputMode="numeric" placeholder={`max ${cratesStillOut}`}
                                value={returningSaleId === sale.id ? returnQty : ''}
                                onChange={e => { setReturningSaleId(sale.id); setReturnQty(e.target.value) }}
                                style={{ width: 80, padding: '4px 8px', borderRadius: '7px', border: `1.5px solid ${SIGNAL.orange}`, fontSize: '12px', outline: 'none', background: TINT.orange }}
                              />
                              <button onClick={() => handleCrateReturn(sale)}
                                disabled={returning || returningSaleId !== sale.id || !returnQty}
                                style={{ padding: '4px 10px', borderRadius: '7px', background: SIGNAL.orange, color: 'white', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                                {returning && returningSaleId === sale.id ? '…' : 'Confirm'}
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: saleBalance > 0 ? SIGNAL.red : SIGNAL.green }}>
                            {fmt(saleBalance > 0 ? saleBalance : parseFloat(sale.amount))}
                          </span>
                          {saleBalance > 0 && sale.payment_status === 'Credit' && (
                            <button onClick={() => handleMarkPaid(sale.id)} disabled={markingPaid === sale.id} style={successBtnSmall}>
                              {markingPaid === sale.id ? '…' : 'Paid'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {!isAdmin && (
                  <div style={{ padding: '8px 16px', background: '#F2F2F7' }}>
                    <span style={{ fontSize: '12px', color: '#8E8E93' }}>Only admin can delete payment records.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      </>}
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
}
const fieldLabel = { display: 'block', fontSize: 11, color: '#8E8E93', marginBottom: 4 }
const fieldInput = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '1.5px solid #D1D1D6', fontSize: '13px', color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF'
}
const primaryBtnSmall = {
  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
  background: '#1C1C1E', color: 'white', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4,
}
const secondaryBtnSmall = {
  padding: '9px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1.5px solid #D1D1D6',
  color: '#8E8E93', fontWeight: 500, fontSize: '13px', cursor: 'pointer',
}
const successBtnSmall = {
  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
  background: SIGNAL.green, color: 'white', border: 'none', cursor: 'pointer',
}
const textLink = (color) => ({
  fontSize: '12px', fontWeight: 500, color, textDecoration: 'none', padding: '7px 4px',
})
const textLinkBtn = (color) => ({
  fontSize: '12px', fontWeight: 500, color, background: 'none', border: 'none', cursor: 'pointer', padding: '7px 4px',
})