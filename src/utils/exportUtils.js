import { CRATE_SIZE } from './dateUtils.js'

function toCSV(rows, filename) {
  if (!rows.length) { alert('No data to export.'); return }
  const headers = Object.keys(rows[0])
  const esc = v => {
    const s = String(v ?? '')
    return (s.includes(',') || s.includes('\n') || s.includes('"'))
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export function exportSalesCSV(sales) {
  const today = new Date().toISOString().slice(0,10)
  const rows = sales.map(s => ({
    'Date':             s.date,
    'Customer':         s.customer_name,
    'Crates Sold':      s.crates,
    'Single Eggs':      s.singles,
    'Total Eggs':       s.crates * CRATE_SIZE + s.singles,
    'Amount (₦)':       s.amount,
    'Payment Status':   s.payment_status,
    'Paid At':          s.paid_at || '',
    'Crates Loaned':    s.crates_loaned || 0,
    'Crates Returned':  s.crates_returned || 0,
    'Notes':            s.notes || '',
  }))
  toCSV(rows, `ROKDIV-sales-${today}.csv`)
}

export function exportCollectionsCSV(collections) {
  const today = new Date().toISOString().slice(0,10)
  const rows = collections.map(c => ({
    'Date':        c.date,
    'Crates':      c.crates,
    'Single Eggs': c.singles,
    'Total Eggs':  c.crates * CRATE_SIZE + c.singles,
    'Notes':       c.notes || '',
  }))
  toCSV(rows, `ROKDIV-collections-${today}.csv`)
}
