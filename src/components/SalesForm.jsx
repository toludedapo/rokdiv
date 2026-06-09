import React, { useState } from 'react'
import { Plus, ShoppingCart, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'

export default function SalesForm({ sales, cratesInFarm, onSave, onDelete, onMarkPaid, onQueueOffline, showToast }) {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', crates_loaned: '', notes: '' })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('All')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.date)                 return setError('Pick a date.')
    if (!form.amount || isNaN(+form.amount)) return setError('Enter a valid amount.')
    if (form.crates === '' && form.singles === '') return setError('Enter quantity sold.')
    const loaned = Number(form.crates_loaned) || 0
    if (loaned > cratesInFarm) return setError(`Only ${cratesInFarm} crate(s) available.`)
    setError('')
    setSaving(true)
    const payload = { date: form.date, customer_name: form.customer_name.trim(), crates: Number(form.crates)||0, singles: Number(form.singles)||0, amount: Number(form.amount), payment_status: form.payment_status, crates_loaned: loaned, crates_returned: 0, notes: form.notes.trim(), paid_at: form.payment_status === 'Paid' ? todayISO() : null }
    try {
      await onSave(payload)
      setForm({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', crates_loaned: '', notes: '' })
      showToast('Sale recorded')
    } catch (e) {
      if (onQueueOffline) {
        onQueueOffline(payload)
        setForm({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', crates_loaned: '', notes: '' })
        showToast('Saved offline 💾')
      } else { setError(e.message) }
    } finally { setSaving(false) }
  }

  const total    = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
  const filtered = (filter === 'All' ? sales : sales.filter(s => s.payment_status === filter)).slice().sort((a,b) => a.date < b.date ? 1 : -1)

  return (
    <div className="mx-4" style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #F3F4F6', overflow: 'hidden' }}>

      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EEF1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={13} style={{ color: '#4F6EF7' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Sales Log</span>
          <span style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{sales.length}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: '#9CA3AF' }} /> : <ChevronDown size={14} style={{ color: '#9CA3AF' }} />}
      </button>

      {open && (
        <div className="slide-up" style={{ padding: '0 18px 18px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Customer</label>
              <input type="text" className="field" placeholder="e.g. Mama Tunde" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="field" value={form.payment_status} onChange={e => set('payment_status', e.target.value)} style={{ fontSize: 16 }}>
                <option value="Paid">Paid</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="label">Crates Sold</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" value={form.crates} onChange={e => set('crates', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Singles</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" value={form.singles} onChange={e => set('singles', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Amount (₦)</label>
              <input type="number" inputMode="decimal" className="field" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Crates Loaned <span style={{ color: '#D97706', fontWeight: 400, textTransform: 'none' }}>({cratesInFarm} avail)</span></label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" min="0" max={cratesInFarm} value={form.crates_loaned} onChange={e => set('crates_loaned', e.target.value)} style={{ fontSize: 16 }} />
            </div>
          </div>

          {error && <div style={{ marginTop: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#DC2626' }}>{error}</div>}

          {total > 0 && form.amount && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
              {total.toLocaleString()} eggs · <span className="num" style={{ color: '#D97706', fontWeight: 700 }}>{fmtNaira(form.amount)}</span>
              {Number(form.crates_loaned) > 0 && <> · <span style={{ color: '#4F6EF7', fontWeight: 600 }}>{form.crates_loaned} crates loaned</span></>}
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Record Sale
          </button>

          {sales.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                {['All','Paid','Credit'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 99, border: filter===f ? 'none' : '1.5px solid #E5E7EB', background: filter===f ? 'linear-gradient(135deg,#4F6EF7,#3B55E0)' : '#F9FAFB', color: filter===f ? '#fff' : '#6B7280', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.slice(0,20).map(s => (
                  <div key={s.id} style={{ background: '#F8F9FB', border: '1.5px solid #F3F4F6', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.customer_name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: s.payment_status==='Paid' ? '#ECFDF5' : '#FFFBEB', color: s.payment_status==='Paid' ? '#059669' : '#D97706', border: `1px solid ${s.payment_status==='Paid' ? '#A7F3D0' : '#FDE68A'}` }}>
                            {s.payment_status}
                          </span>
                          {s.isOffline && <span className="badge-offline">💾 Offline</span>}
                          {(s.crates_loaned-(s.crates_returned||0)) > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                              {s.crates_loaned-(s.crates_returned||0)} crates out
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{fmtDate(s.date)} · {(s.crates*CRATE_SIZE+s.singles).toLocaleString()} eggs</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className="num" style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>{fmtNaira(s.amount)}</span>
                        {!s.isOffline && <button onClick={() => onDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 3 }}><Trash2 size={13} /></button>}
                      </div>
                    </div>
                    {s.payment_status === 'Credit' && !s.isOffline && (
                      <button onClick={() => onMarkPaid(s.id)} style={{ marginTop: 8, fontSize: 11, color: '#4F6EF7', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Mark as Fully Paid
                      </button>
                    )}
                  </div>
                ))}
                {filtered.length > 20 && <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>+{filtered.length-20} more</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
