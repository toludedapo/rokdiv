export const CRATE_SIZE = 30

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-NG', { weekday:'short', day:'numeric', month:'short' })
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
}

export function fmtNaira(n) {
  return '₦' + Number(n ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function daysAgo(iso) {
  if (!iso) return 0
  const then = new Date(iso + 'T00:00:00'), now = new Date()
  now.setHours(0,0,0,0)
  return Math.floor((now - then) / 86_400_000)
}

// For money/sale overdue
export function overdueInfo(iso) {
  const d = daysAgo(iso)
  if (d < 3) return { cls: 'badge-green',  label: d === 0 ? 'Today' : `${d}d ago`,    tier: 'ok'    }
  if (d < 7) return { cls: 'badge-yellow', label: `${d}d overdue`,                     tier: 'warn'  }
  return             { cls: 'badge-red',   label: `${d}d overdue`,                     tier: 'alert' }
}

// For crate overdue (7+ days)
export function crateOverdueInfo(iso) {
  const d = daysAgo(iso)
  if (d < 7) return null
  return { label: `Crates ${d}d out`, tier: 'alert' }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6)
}
