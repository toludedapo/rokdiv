import { useState, useMemo } from 'react'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', gray: '#8E8E93' }

const CATEGORIES = [
  { key: 'feed',       label: 'Feed' },
  { key: 'medication', label: 'Medication' },
  { key: 'labour',     label: 'Labour' },
  { key: 'utilities',  label: 'Utilities' },
  { key: 'other',      label: 'Other' },
]

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

export default function ExpenseTracker({ expenses = [], onAdd, onDelete, monthlySales, isAdmin }) {
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [showForm, setShowForm]   = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [form, setForm] = useState({
    category: 'feed',
    amount: '',
    date: now.toISOString().slice(0, 10),
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth
    }), [expenses, viewYear, viewMonth])

  const totalExpenses = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    amount: monthExpenses
      .filter(e => e.category === cat.key)
      .reduce((s, e) => s + parseFloat(e.amount), 0)
  })).filter(c => c.amount > 0)

  const monthRevenue = useMemo(() => {
    if (!monthlySales) return 0
    return monthlySales
      .filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth
      })
      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  }, [monthlySales, viewYear, viewMonth])

  const netProfit = monthRevenue - totalExpenses
  const margin = monthRevenue > 0 ? ((netProfit / monthRevenue) * 100).toFixed(1) : null

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  async function handleSubmit() {
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError('Enter a valid amount'); return
    }
    setSaving(true); setError('')
    const { error: err } = await onAdd(form)
    setSaving(false)
    if (err) { setError('Failed to save. Try again.'); return }
    setForm({ category: 'feed', amount: '', date: now.toISOString().slice(0,10), notes: '' })
    setShowForm(false)
  }

  async function handleDelete(id) {
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontWeight: 500, fontSize: '15px', color: '#1C1C1E' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
      </div>

      {/* P&L summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <PLCard label="Revenue" value={fmt(monthRevenue)} color={SIGNAL.green} />
        <PLCard label="Expenses" value={fmt(totalExpenses)} color={SIGNAL.red} />
        <PLCard
          label={netProfit >= 0 ? 'Net profit' : 'Net loss'}
          value={fmt(Math.abs(netProfit))}
          color={netProfit >= 0 ? '#1C1C1E' : SIGNAL.red}
          sub={margin !== null ? `${margin}% margin` : null}
        />
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div style={cardSurface}>
          <p style={label}>Breakdown</p>
          {byCategory.map(cat => {
            const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
            return (
              <div key={cat.key} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#1C1C1E' }}>{cat.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#1C1C1E' }}>{fmt(cat.amount)}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: '#E5E5EA', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#1C1C1E', borderRadius: '2px' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add expense button */}
      <button onClick={() => setShowForm(v => !v)} style={dashedBtnStyle}>
        {showForm ? 'Cancel' : '+ Log expense'}
      </button>

      {/* Inline form */}
      {showForm && (
        <div style={{ ...cardSurface, marginBottom: '16px' }}>
          <p style={label}>New expense</p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', marginTop: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                  border: `1.5px solid ${form.category === cat.key ? '#1C1C1E' : '#D1D1D6'}`,
                  background: form.category === cat.key ? '#1C1C1E' : '#FFFFFF',
                  color: form.category === cat.key ? '#FFFFFF' : '#8E8E93',
                  cursor: 'pointer'
                }}>
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={fieldLabel}>Amount (₦)</label>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={fieldInput} />
            </div>
            <div>
              <label style={fieldLabel}>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={fieldInput} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={fieldLabel}>Notes (optional)</label>
            <input type="text" placeholder="e.g. Vital feed 50kg bags" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={fieldInput} />
          </div>

          {error && <p style={{ color: SIGNAL.red, fontSize: '12px', marginBottom: '8px' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      )}

      {/* Expense list */}
      {monthExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8E8E93', fontSize: '14px' }}>
          No expenses logged for {MONTHS[viewMonth]}.<br />
          <span style={{ fontSize: '12px' }}>Tap "Log expense" above to add one.</span>
        </div>
      ) : (
        <div style={cardSurface}>
          <p style={label}>
            All entries — {monthExpenses.length} record{monthExpenses.length !== 1 ? 's' : ''}
          </p>

          {!isAdmin && (
            <div style={noticeBox}>
              <span style={{ fontSize: '12px', color: '#8E8E93' }}>
                Only the admin can delete records.
              </span>
            </div>
          )}

          {monthExpenses.map(exp => {
            const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[4]
            return (
              <div key={exp.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 0', borderBottom: '0.5px solid #E5E5EA'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1C1C1E' }}>
                    {cat.label}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8E8E93' }}>
                    {new Date(exp.date).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                    {exp.notes ? ` · ${exp.notes}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: SIGNAL.red }}>
                    -{fmt(exp.amount)}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deleting === exp.id}
                      style={{
                        background: 'rgba(255,69,58,0.1)',
                        border: 'none', cursor: 'pointer', color: SIGNAL.red,
                        fontSize: '13px', padding: '4px 8px', lineHeight: 1,
                        borderRadius: '6px', fontWeight: 500
                      }}>
                      {deleting === exp.id ? '…' : '×'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PLCard({ label: l, value, color, sub }) {
  return (
    <div style={{ ...cardSurface, textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#8E8E93' }}>{l}</p>
      <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, color, letterSpacing: '-0.01em' }}>{value}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#8E8E93' }}>{sub}</p>}
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', marginBottom: '14px',
}
const label = { margin: '0 0 12px', fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const dashedBtnStyle = {
  display: 'block', width: '100%', padding: '13px',
  background: '#FFFFFF', border: '1.5px dashed #D1D1D6',
  borderRadius: '12px', fontSize: '14px', fontWeight: 500,
  color: '#8E8E93', cursor: 'pointer', marginBottom: '14px', textAlign: 'center'
}
const primaryBtn = {
  width: '100%', padding: '13px', borderRadius: 12, background: '#0D0D0D', color: '#FFFFFF',
  border: 'none', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
}
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #D1D1D6', fontSize: '14px', color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}
const fieldLabel = { display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 5 }
const navBtnStyle = {
  background: '#FFFFFF', border: '1.5px solid #D1D1D6', borderRadius: '8px',
  width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1C1C1E'
}
const noticeBox = {
  background: '#F2F2F7', borderRadius: '10px',
  padding: '8px 12px', marginBottom: '10px',
}