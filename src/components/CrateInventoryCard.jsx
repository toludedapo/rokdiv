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
    <div className="mx-4" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9CA3AF', fontSize: 13 }}>
      <Loader2 size={14} className="animate-spin" /> Loading crates…
    </div>
  )

  return (
    <div className="mx-4" style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #F3F4F6', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: editing ? '1px solid #F3F4F6' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={14} style={{ color: '#D97706' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Crate Inventory</span>
        </div>
        <button onClick={() => { setEditing(e => !e); setInput(String(totalOwned)) }} style={{ width: 30, height: 30, borderRadius: 8, background: editing ? '#EEF1FF' : '#F3F4F6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: editing ? '#4F6EF7' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.15s' }}>
          <Settings2 size={14} />
        </button>
      </div>

      {/* Edit total */}
      {editing && (
        <div className="slide-up" style={{ padding: '12px 18px', background: '#F8F9FB', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Total owned:</label>
          <input type="number" inputMode="numeric" value={input} onChange={e => setInput(e.target.value)}
            className="field" style={{ fontSize: 15, flex: 1, padding: '8px 12px' }} autoFocus />
          <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #4F6EF7, #3B55E0)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {saving && <Loader2 size={11} className="animate-spin" />} Save
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { icon: Package,      label: 'Total',     value: totalOwned, color: '#6B7280', bg: '#F3F4F6'  },
          { icon: PackageCheck, label: 'In Farm',   value: inFarm,     color: '#059669', bg: '#ECFDF5'  },
          { icon: PackageOpen,  label: 'With Buyers', value: cratesOut, color: '#D97706', bg: '#FFFBEB' },
        ].map(({ icon: Icon, label, value, color, bg }, idx) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', borderRight: idx < 2 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <Icon size={13} style={{ color }} />
            </div>
            <span className="num" style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalOwned > 0 && cratesOut > 0 && (
        <div style={{ padding: '10px 18px 14px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>With buyers</span>
            <span className="num" style={{ fontSize: 10, color: '#D97706', fontWeight: 700 }}>{pctOut}%</span>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${pctOut > 70 ? 'progress-fill-warn' : ''}`} style={{ width: `${pctOut}%` }} />
          </div>
          {inFarm === 0 && (
            <p style={{ fontSize: 11, color: '#D97706', textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              All crates are currently with buyers
            </p>
          )}
        </div>
      )}
    </div>
  )
}
