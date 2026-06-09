import React, { useState } from 'react'
import { Package, PackageOpen, PackageCheck, Settings2, Loader2 } from 'lucide-react'

export default function CrateInventoryCard({ inventory, cratesOut, loading, onSetTotalOwned }) {
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
    <div
      className="mx-4 flex items-center justify-center gap-2"
      style={{
        background: '#162010',
        border: '1px solid #2D4020',
        borderRadius: 16,
        padding: 20,
        color: '#4A6336',
        fontSize: 13,
      }}
    >
      <Loader2 size={14} className="animate-spin" /> Loading crates…
    </div>
  )

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #2D4020',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={15} style={{ color: '#E8B75A' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8' }}>Crate Inventory</span>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setInput(String(totalOwned)) }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: editing ? 'rgba(122,181,72,0.15)' : 'transparent',
            border: '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: editing ? '#9FD46A' : '#4A6336',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Settings2 size={14} />
        </button>
      </div>

      {/* Edit total */}
      {editing && (
        <div
          className="slide-up"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #2D4020',
            background: 'rgba(122,181,72,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <label style={{ fontSize: 11, color: '#6A806A', whiteSpace: 'nowrap', fontWeight: 500 }}>
            Total owned:
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="field"
            style={{ fontSize: 15, flex: 1, padding: '8px 12px' }}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #7AB548, #5A9430)',
              color: '#0E1A0A',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving && <Loader2 size={11} className="animate-spin" />} Save
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: cratesOut > 0 && totalOwned > 0 ? '1px solid #2D4020' : 'none' }}>
        {[
          { icon: Package,      label: 'Total',     value: totalOwned, color: '#A8B8A0' },
          { icon: PackageCheck, label: 'In Farm',   value: inFarm,     color: '#9FD46A' },
          { icon: PackageOpen,  label: 'With Buyers', value: cratesOut, color: '#E8B75A' },
        ].map(({ icon: Icon, label, value, color }, idx) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '14px 8px',
              borderRight: idx < 2 ? '1px solid #2D4020' : 'none',
            }}
          >
            <Icon size={15} style={{ color, marginBottom: 4 }} />
            <span className="num" style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, color: '#4A6336', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar — % out with buyers */}
      {totalOwned > 0 && cratesOut > 0 && (
        <div style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#4A6336', fontWeight: 500 }}>With buyers</span>
            <span className="num" style={{ fontSize: 10, color: '#E8B75A', fontWeight: 600 }}>{pctOut}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${pctOut > 70 ? 'progress-fill-warn' : ''}`}
              style={{ width: `${pctOut}%` }}
            />
          </div>
          {inFarm === 0 && (
            <p style={{ fontSize: 11, color: '#E8B75A', textAlign: 'center', marginTop: 8, fontWeight: 500 }}>
              All crates are currently with buyers
            </p>
          )}
        </div>
      )}
    </div>
  )
}
