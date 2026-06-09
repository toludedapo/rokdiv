import React, { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 2200)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium
      px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap transition-all duration-300
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {message}
    </div>
  )
}
