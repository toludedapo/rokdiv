import { buildSalesCSVRows, buildCollectionsCSVRows } from '../lib/calculations.js'

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

// Row-building logic now lives in lib/calculations.js (buildSalesCSVRows,
// buildCollectionsCSVRows) where it's unit tested. This file only handles
// the browser-only download mechanics, which can't be unit tested.
export function exportSalesCSV(sales, payments = []) {
  const today = new Date().toISOString().slice(0,10)
  const rows = buildSalesCSVRows(sales, payments)
  toCSV(rows, `ROKDIV-sales-${today}.csv`)
}

export function exportCollectionsCSV(collections) {
  const today = new Date().toISOString().slice(0,10)
  const rows = buildCollectionsCSVRows(collections)
  toCSV(rows, `ROKDIV-collections-${today}.csv`)
}
