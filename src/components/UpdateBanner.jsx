import React from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function UpdateBanner({ onDismiss, bottomOffset = 0 }) {
  return (
    <div style={{ ...bar, bottom: bottomOffset }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RefreshCw size={15} color="#FFFFFF" />
        <span style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 500 }}>
          A new version of ROKDIV is ready
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => window.location.reload()} style={refreshBtn}>
          Refresh
        </button>
        <button onClick={onDismiss} style={dismissBtn} aria-label="Dismiss">
          <X size={15} color="rgba(255,255,255,0.6)" />
        </button>
      </div>
    </div>
  )
}

const bar = {
  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
  background: '#0D0D0D',
  padding: '12px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12,
  boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
}
const refreshBtn = {
  background: '#FFFFFF', color: '#0D0D0D', border: 'none', borderRadius: 10,
  padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const dismissBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
  display: 'flex', alignItems: 'center',
}
