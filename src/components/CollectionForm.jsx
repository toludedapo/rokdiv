import React, { useState } from 'react'
import { Plus, Egg, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, CRATE_SIZE } from '../utils/dateUtils.js'

export default function CollectionForm({ collections, onSave, onDelete, showToast }) {
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
    try {
      await onSave({
        date: form.date,
        crates: Number(form.crates) || 0,
        singles: Number(form.singles) || 0,
        notes: form.notes.trim(),
      })
      setForm({ date: todayISO(), crates: '', singles: '', notes: '' })
      showToast('Collection logged')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total  = (Number(form.crates) || 0) * CRATE_SIZE + (Number(form.singles) || 0)
  const sorted = [...collections].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div
      className="mx-4"
      style={{
        background: '#162010',
        border: '1px solid #2D4020',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#F0EDE8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Egg size={15} style={{ color: '#E8B75A' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Collection Log</span>
          <span
            style={{
              fontSize: 11,
              background: '#1C2A14',
              border: '1px solid #2D4020',
              borderRadius: 99,
              padding: '1px 8px',
              color: '#4A6336',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {collections.length}
          </span>
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: '#4A6336' }} />
          : <ChevronDown size={14} style={{ color: '#4A6336' }} />}
      </button>

      {open && (
        <div
          className="slide-up"
          style={{ padding: '0 16px 16px', borderTop: '1px solid #2D4020' }}
        >
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Date</label>
              <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Crates (×{CRATE_SIZE})</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.crates} onChange={e => set('crates', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">Singles</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.singles} onChange={e => set('singles', e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Notes (optional)</label>
              <input type="text" className="field" placeholder="e.g. Morning batch"
                value={form.notes} onChange={e => set('notes', e.target.value)} style={{ fontSize: 16 }} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 10, background: 'rgba(220,60,40,0.1)', border: '1px solid rgba(220,60,40,0.2)', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#F07060' }}>
              {error}
            </div>
          )}

          {total > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#4A6336' }}>
              Total: <span className="num" style={{ color: '#9FD46A', fontWeight: 600 }}>{total.toLocaleString()} eggs</span>
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Log Collection
          </button>

          {sorted.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="label">Recent Entries</p>
              <div>
                {sorted.slice(0, 8).map((c, idx) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: idx < Math.min(sorted.length, 8) - 1 ? '1px solid #2D4020' : 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8' }}>{fmtDate(c.date)}</p>
                      <p style={{ fontSize: 11, color: '#4A6336', marginTop: 2 }}>
                        {c.notes || `${c.crates} crates + ${c.singles} singles`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 600, color: '#9FD46A' }}>
                        {(c.crates * CRATE_SIZE + c.singles).toLocaleString()}
                      </span>
                      <button
                        onClick={() => onDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2D4020', padding: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F07060'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2D4020'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {sorted.length > 8 && (
                  <p style={{ fontSize: 11, color: '#4A6336', textAlign: 'center', paddingTop: 8 }}>
                    +{sorted.length - 8} older entries
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
