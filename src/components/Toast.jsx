import React, { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 2400)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 96,
      left: '50%',
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
      zIndex: 50,
      background: '#111827',
      color: '#F9FAFB',
      borderRadius: 99,
      padding: '10px 18px',
      fontSize: 13,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      transition: 'all 0.3s ease',
      opacity: visible ? 1 : 0,
    }}>
      <CheckCircle2 size={14} style={{ color: '#34D399', flexShrink: 0 }} />
      {message}
    </div>
  )
}
