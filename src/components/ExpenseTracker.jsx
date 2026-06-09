import { useState, useMemo } from 'react'

const CATEGORIES = [
  { key: 'feed',       label: 'Feed',        icon: '🌾', color: '#F59E0B' },
  { key: 'medication', label: 'Medication',  icon: '💊', color: '#EF4444' },
  { key: 'labour',     label: 'Labour',      icon: '👷', color: '#8B5CF6' },
  { key: 'utilities',  label: 'Utilities',   icon: '⚡', color: '#3B82F6' },
  { key: 'other',      label: 'Other',       icon: '📦', color: '#6B7280' },
]

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

export default function ExpenseTracker({ expenses, onAdd, onDelete, monthlySales, isAdmin }) {
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
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
      </div>

      {/* P&L summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <PLCard label="Revenue" value={fmt(monthRevenue)} color="#10B981" />
        <PLCard label="Expenses" value={fmt(totalExpenses)} color="#EF4444" />
        <PLCard
          label={netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
          value={fmt(Math.abs(netProfit))}
          color={netProfit >= 0 ? '#4F6EF7' : '#EF4444'}
          sub={margin !== null ? `${margin}% margin` : null}
        />
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionLabel}>Breakdown</p>
          {byCategory.map(cat => {
            const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
            return (
              <div key={cat.key} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{fmt(cat.amount)}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add expense button */}
      <button onClick={() => setShowForm(v => !v)} style={addBtnStyle}>
        {showForm ? '✕ Cancel' : '+ Log Expense'}
      </button>

      {/* Inline form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: '16px', border: '1.5px solid #4F6EF7' }}>
          <p style={sectionLabel}>New Expense</p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  border: `1.5px solid ${form.category === cat.key ? cat.color : '#E5E7EB'}`,
                  background: form.category === cat.key ? `${cat.color}15` : 'white',
                  color: form.category === cat.key ? cat.color : '#6B7280',
                  cursor: 'pointer'
                }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Amount (₦)</label>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <input type="text" placeholder="e.g. Vital feed 50kg bags" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={inputStyle} />
          </div>

          {error && <p style={{ color: '#EF4444', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={saving}
            style={{ ...addBtnStyle, background: '#4F6EF7', color: 'white', border: 'none', marginBottom: 0 }}>
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      )}

      {/* Expense list */}
      {monthExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: '14px' }}>
          No expenses logged for {MONTHS[viewMonth]}.<br />
          <span style={{ fontSize: '12px' }}>Tap "Log Expense" above to add one.</span>
        </div>
      ) : (
        <div style={cardStyle}>
          <p style={sectionLabel}>
            All Entries — {monthExpenses.length} record{monthExpenses.length !== 1 ? 's' : ''}
          </p>

          {/* Admin-only notice for non-admins */}
          {!isAdmin && (
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px',
              padding: '8px 12px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <span style={{ fontSize: '13px' }}>🔒</span>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                Only the admin can delete records.
              </span>
            </div>
          )}

          {monthExpenses.map(exp => {
            const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[4]
            return (
              <div key={exp.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid #F3F4F6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: `${cat.color}18`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '15px', flexShrink: 0
                  }}>{cat.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {cat.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
                      {new Date(exp.date).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                      {exp.notes ? ` · ${exp.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>
                    -{fmt(exp.amount)}
                  </span>
                  {/* Delete only visible to admin */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deleting === exp.id}
                      title="Delete record"
                      style={{
                        background: deleting === exp.id ? '#F3F4F6' : '#FEE2E2',
                        border: 'none', cursor: 'pointer', color: '#EF4444',
                        fontSize: '13px', padding: '4px 8px', lineHeight: 1,
                        borderRadius: '6px', fontWeight: 700
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

function PLCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '12px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textAlign: 'center'
    }}>
      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color, lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#9CA3AF' }}>{sub}</p>}
    </div>
  )
}

const cardStyle = {
  background: 'white', borderRadius: '14px', padding: '16px',
  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', marginBottom: '14px'
}
const sectionLabel = {
  margin: '0 0 12px', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF'
}
const addBtnStyle = {
  display: 'block', width: '100%', padding: '13px',
  background: 'white', border: '1.5px dashed #D1D5DB',
  borderRadius: '12px', fontSize: '14px', fontWeight: 600,
  color: '#4F6EF7', cursor: 'pointer', marginBottom: '14px', textAlign: 'center'
}
const inputStyle = {
  width: '100%', padding: '9px 11px', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: '#FAFAFA'
}
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em'
}
const navBtnStyle = {
  background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px',
  width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151'
}
