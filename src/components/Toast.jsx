import React, { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 2400)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  return (
    <div
      className={`fixed bottom-28 left-1/2 z-50 flex items-center gap-2.5 whitespace-nowrap transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(8px)',
        background: 'linear-gradient(135deg, #1C2A14, #2D4020)',
        border: '1px solid #4A6336',
        borderRadius: 99,
        padding: '10px 18px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: 13,
        fontWeight: 500,
        color: '#F0EDE8',
      }}
    >
      <CheckCircle2 size={14} style={{ color: '#9FD46A', flexShrink: 0 }} />
      {message}
    </div>
  )
}
