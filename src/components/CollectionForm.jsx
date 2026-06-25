import React, { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, CRATE_SIZE } from '../utils/dateUtils.js'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', gray: '#8E8E93' }

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
        showToast('Saved offline')
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
    <div style={cardSurface}>

      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={label}>Collection log</p>
          <span style={countPill}>{collections.length}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: '#8E8E93' }} /> : <ChevronDown size={14} style={{ color: '#8E8E93' }} />}
      </button>

      {open && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fieldLabel}>Date</label>
              <input type="date" style={fieldInput} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Crates (×{CRATE_SIZE})</label>
              <input type="number" inputMode="numeric" style={fieldInput} placeholder="0" value={form.crates} onChange={e => set('crates', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Singles</label>
              <input type="number" inputMode="numeric" style={fieldInput} placeholder="0" value={form.singles} onChange={e => set('singles', e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fieldLabel}>Notes (optional)</label>
              <input type="text" style={fieldInput} placeholder="e.g. Morning batch" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 10, background: 'rgba(255,69,58,0.1)', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: SIGNAL.red }}>{error}</div>
          )}

          {total > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#8E8E93' }}>
              <span style={{ color: SIGNAL.green, fontWeight: 500 }}>
                {Number(form.crates)||0} crate{(Number(form.crates)||0)!==1?'s':''}
                {Number(form.singles)>0?` + ${form.singles} singles`:''}
              </span>
              {' = '}{total.toLocaleString()} eggs
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Log collection
          </button>

          {sorted.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p style={label}>Recent entries</p>
              {sorted.slice(0, 8).map((c, idx) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: idx < Math.min(sorted.length, 8) - 1 ? '0.5px solid #E5E5EA' : 'none' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 14, color: '#1C1C1E', margin: 0 }}>{fmtDate(c.date)}</p>
                      {c.collected_at && (
                        <span style={{ fontSize: 12, color: '#8E8E93' }}>· {fmtTime(c.collected_at)}</span>
                      )}
                      {c.isOffline && <span style={offlinePill}>Offline</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>{c.notes || `${c.crates} crates + ${c.singles} singles`}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ ...statValue, fontSize: 14, display:'block' }}>
                        {c.crates} crate{parseInt(c.crates)!==1?'s':''}
                      </span>
                      {parseInt(c.singles) > 0 && (
                        <span style={{ fontSize:11, color:'#8E8E93' }}>+{c.singles} singles</span>
                      )}
                    </div>
                    {!c.isOffline && (
                      <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sorted.length > 8 && <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center', paddingTop: 8 }}>+{sorted.length - 8} older entries</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
}
const label = { margin: 0, fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const countPill = {
  fontSize: 11, background: '#F2F2F7', borderRadius: 99, padding: '2px 8px',
  color: '#8E8E93', fontWeight: 500,
}
const fieldLabel = {
  display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 4,
}
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #D1D1D6', fontSize: 16, color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}
const primaryBtn = {
  width: '100%', marginTop: 12, padding: '13px', borderRadius: 12,
  background: '#0D0D0D', color: '#FFFFFF', border: 'none',
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const statValue = {
  margin: 0, fontWeight: 500, color: '#1C1C1E', letterSpacing: '-0.01em',
}
const offlinePill = {
  fontSize: 11, background: '#F2F2F7', color: '#8E8E93', borderRadius: 99, padding: '1px 7px',
}