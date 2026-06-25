import React, { useState } from 'react'
import { Loader2, Settings2 } from 'lucide-react'

const SIGNAL = {
  green:  '#34C759',
  red:    '#FF453A',
  orange: '#FF9F0A',
  gray:   '#8E8E93',
}

export default function CrateInventoryCard({ inventory, cratesOut = 0, loading, onSetTotalOwned }) {
  const [editing, setEditing] = useState(false)
  const [input,   setInput]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const totalOwned = inventory?.total_owned ?? 0
  const inFarm     = Math.max(0, totalOwned - cratesOut)
  const pctOut     = totalOwned > 0 ? Math.round((cratesOut / totalOwned) * 100) : 0

  async function handleSave() {
    const val = parseInt(input, 10)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    try { await onSetTotalOwned(val) } finally { setSaving(false); setEditing(false) }
  }

  if (loading) return (
    <div style={cardSurface}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0', color: '#8E8E93', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" /> Loading crates…
      </div>
    </div>
  )

  return (
    <div style={cardSurface}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editing ? 12 : 16 }}>
        <p style={label}>Crate inventory</p>
        <button onClick={() => { setEditing(e => !e); setInput(String(totalOwned)) }}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: editing ? '#1C1C1E' : '#F2F2F7',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: editing ? '#FFFFFF' : '#8E8E93', cursor: 'pointer'
          }}>
          <Settings2 size={14} />
        </button>
      </div>

      {/* Edit total */}
      {editing && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#8E8E93', whiteSpace: 'nowrap' }}>Total owned</label>
          <input type="number" inputMode="numeric" value={input} onChange={e => setInput(e.target.value)}
            style={{
              fontSize: 14, flex: 1, padding: '8px 10px', borderRadius: 10,
              border: '1.5px solid #D1D1D6', outline: 'none'
            }} autoFocus />
          <button onClick={handleSave} disabled={saving}
            style={{
              background: '#1C1C1E', color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap'
            }}>
            {saving && <Loader2 size={11} className="animate-spin" />} Save
          </button>
        </div>
      )}

      {/* Stats — same stat typography as SummaryCards.jsx, no colored icon circles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
        {[
          { label: 'Total',       value: totalOwned, color: null },
          { label: 'In farm',     value: inFarm,     color: null },
          { label: 'With buyers', value: cratesOut,  color: cratesOut > 0 ? SIGNAL.orange : null },
        ].map(({ label: l, value, color }, idx) => (
          <div key={l} style={{
            display: 'flex', flexDirection: 'column',
            paddingRight: idx < 2 ? 12 : 0,
            borderRight: idx < 2 ? '0.5px solid #E5E5EA' : 'none'
          }}>
            <span style={{ ...statValue, fontSize: 24, color: color || '#1C1C1E' }}>{value}</span>
            <span style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalOwned > 0 && cratesOut > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid #E5E5EA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#8E8E93' }}>With buyers</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: pctOut > 70 ? SIGNAL.red : SIGNAL.orange }}>{pctOut}%</span>
          </div>
          <div style={{ height: 4, background: '#E5E5EA', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pctOut}%`, borderRadius: 4,
              background: pctOut > 70 ? SIGNAL.red : SIGNAL.orange
            }} />
          </div>
          {inFarm === 0 && (
            <p style={{ fontSize: 12, color: SIGNAL.red, textAlign: 'center', marginTop: 8 }}>
              All crates are currently with buyers
            </p>
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
const label = {
  margin: 0, fontSize: 12, fontWeight: 500, color: '#8E8E93',
}
const statValue = {
  margin: 0, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
}