import React, { useState } from 'react'
import { Package, PackageOpen, PackageCheck, Settings2, Loader2 } from 'lucide-react'

export default function CrateInventoryCard({ inventory, cratesOut, loading, onSetTotalOwned }) {
  const [editing, setEditing] = useState(false)
  const [input,   setInput]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const totalOwned = inventory?.total_owned ?? 0
  const inFarm     = Math.max(0, totalOwned - cratesOut)

  async function handleSave() {
    const val = parseInt(input, 10)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    try { await onSetTotalOwned(val) } finally { setSaving(false); setEditing(false) }
  }

  if (loading) return (
    <div className="mx-4 bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
      <Loader2 size={15} className="animate-spin" /> Loading crates…
    </div>
  )

  return (
    <div className="mx-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-farm-amber" />
          <span className="text-sm font-semibold text-gray-700">Crate Inventory</span>
        </div>
        <button onClick={() => { setEditing(e => !e); setInput(String(totalOwned)) }}
          className="text-gray-400 hover:text-farm-green transition-colors p-1 rounded-lg hover:bg-farm-green-light">
          <Settings2 size={15} />
        </button>
      </div>

      {/* Set total owned */}
      {editing && (
        <div className="px-4 py-3 bg-farm-amber-light/30 border-b border-amber-100 flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Total owned:</label>
          <input
            type="number" inputMode="numeric" value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
            style={{ fontSize: 16 }} autoFocus
          />
          <button onClick={handleSave} disabled={saving}
            className="bg-farm-green text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60">
            {saving ? <Loader2 size={12} className="animate-spin" /> : null} Save
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {[
          { icon: Package,      label: 'Total',    value: totalOwned, color: 'text-gray-700'       },
          { icon: PackageCheck, label: 'In-Farm',  value: inFarm,     color: 'text-farm-green'     },
          { icon: PackageOpen,  label: 'With Buyers', value: cratesOut, color: 'text-farm-amber'   },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-3 gap-0.5">
            <Icon size={16} className={color} />
            <span className={`text-lg font-semibold num ${color}`}>{value}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {inFarm === 0 && totalOwned > 0 && (
        <div className="px-4 py-2 bg-farm-amber-light border-t border-amber-100">
          <p className="text-[11px] text-farm-amber font-medium text-center">
            ⚠️ All crates are currently with buyers
          </p>
        </div>
      )}
    </div>
  )
}
