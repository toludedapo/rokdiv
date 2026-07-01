import React, { useState } from 'react'
import { Loader2, Package } from 'lucide-react'

export default function CrateSetupPrompt({ onSetTotalOwned, onDismiss }) {
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    const val = parseInt(input, 10)
    if (isNaN(val) || val <= 0) {
      setError('Enter a number greater than 0')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSetTotalOwned(val)
      onDismiss()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#F2F2F7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
        }}>
          <Package size={20} color="#1C1C1E" />
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 500, color: '#1C1C1E', letterSpacing: '-0.02em' }}>
          How many crates does the farm own?
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8E8E93', lineHeight: 1.4 }}>
          This sets your total crate inventory so we can track how many are in the farm versus with buyers. You can change it anytime from the Home tab.
        </p>

        <input
          type="number"
          inputMode="numeric"
          autoFocus
          placeholder="e.g. 200"
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '12px 14px',
            borderRadius: 12, border: `1.5px solid ${error ? '#FF453A' : '#D1D1D6'}`, outline: 'none',
            marginBottom: error ? 6 : 16,
          }}
        />
        {error && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#FF453A' }}>{error}</p>
        )}

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', background: '#1C1C1E', color: '#FFFFFF', border: 'none', borderRadius: 12,
          padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: saving ? 0.6 : 1,
        }}>
          {saving && <Loader2 size={14} className="animate-spin" />} Save
        </button>

        <button onClick={onDismiss} style={{
          width: '100%', background: 'none', border: 'none', marginTop: 12,
          fontSize: 12, color: '#8E8E93', cursor: 'pointer', padding: '4px',
        }}>
          I'll set this later
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  zIndex: 1000, padding: 20,
  overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  paddingTop: 'max(env(safe-area-inset-top), 20px)',
  paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
}
const modal = {
  background: '#FFFFFF', borderRadius: 20, padding: 24,
  width: '100%', maxWidth: 360,
  marginTop: 'max(10vh, 20px)', marginBottom: 20,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}
