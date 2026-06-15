import React, { useState } from 'react'
import { Plus, Egg, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, CRATE_SIZE } from '../utils/dateUtils.js'

export default function CollectionForm({ collections, onSave, onDelete, onQueueOffline, showToast }) {
  const [open,   setOpen]   = useState(true)
  const [form,   setForm]   = useState({ date: todayISO(), crates: '', singles: '', notes: '' })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.date) return setError('Pick a date.')
    if (form.crates === '' && form.singles === '') return setError('Enter crates or singles.')
    setError('')
    setSaving(true)
    const now = new Date()
    const payload = {
      date: form.date,
      crates: Number(form.crates)||0,
      singles: Number(form.singles)||0,
      notes: form.notes.trim(),
      collected_at: now.toISOString()
    }
    try {
      await onSave(payload)
      setForm({ date: todayISO(), crates: '', singles: '', notes: '' })
      showToast('Collection logged')
    } catch (e) {
      if (onQueueOffline) {
        onQueueOffline(payload)
        setForm({ date: todayISO(), crates: '', singles: '', notes: '' })
        showToast('Saved offline 💾')
      } else { setError(e.message) }
    } finally { setSaving(false) }
  }

  const total  = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
  const sorted = [...collections].sort((a,b) => a.date < b.date ? 1 : -1)

  function fmtTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div className="mx-4" style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #F3F4F6', overflow: 'hidden' }}>

      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Egg size={13} style={{ color: '#D97706' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Collection Log</span>
          <span style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
            {collections.length}
          </span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: '#9CA3AF' }} /> : <ChevronDown size={14} style={{ color: '#9CA3AF' }} />}
      </button>

      {open && (
        <div className="slide-up" style={{ padding: '0 18px 18px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Date</label>
              <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Crates (×{CRATE_SIZE})</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" value={form.crates} onChange={e => set('crates', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Singles</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" value={form.singles} onChange={e => set('singles', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Notes (optional)</label>
              <input type="text" className="field" placeholder="e.g. Morning batch" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ fontSize: 16 }} />
            </div>
          </div>

          {error && <div style={{ marginTop: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#DC2626' }}>{error}</div>}

          {total > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
              <span className="num" style={{ color: '#059669', fontWeight: 700 }}>
                {Number(form.crates)||0} crate{(Number(form.crates)||0)!==1?'s':''}
                {Number(form.singles)>0?` + ${form.singles} singles`:''}
              </span>
              {' = '}<span style={{ color:'#6B7280' }}>{total.toLocaleString()} eggs</span>
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Log Collection
          </button>

          {sorted.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="label">Recent Entries</p>
              {sorted.slice(0, 8).map((c, idx) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < Math.min(sorted.length, 8) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmtDate(c.date)}</p>
                      {c.collected_at && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {fmtTime(c.collected_at)}</span>
                      )}
                      {c.isOffline && <span className="badge-offline">💾 Offline</span>}
                    </div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{c.notes || `${c.crates} crates + ${c.singles} singles`}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign:'right' }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 800, color: '#059669', display:'block' }}>
                        {c.crates} crate{parseInt(c.crates)!==1?'s':''}
                      </span>
                      {parseInt(c.singles) > 0 && (
                        <span style={{ fontSize:10, color:'#9CA3AF' }}>+{c.singles} singles</span>
                      )}
                    </div>
                    {!c.isOffline && (
                      <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sorted.length > 8 && <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingTop: 8 }}>+{sorted.length - 8} older entries</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}