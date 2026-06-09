import React, { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Package, PackageCheck, Loader2 } from 'lucide-react'
import { fmtDate, fmtNaira, overdueInfo, crateOverdueInfo, CRATE_SIZE } from '../utils/dateUtils.js'

export function computeDebtors(sales) {
  const creditSales = sales.filter(s => s.payment_status === 'Credit')
  const map = {}
  for (const s of creditSales) {
    const key = s.customer_name?.trim().toLowerCase()
    if (!key) continue
    if (!map[key]) map[key] = { name: s.customer_name.trim(), owed: 0, eggs: 0, oldest: s.date, sales: [], cratesOut: 0, oldestCrateDate: null }
    map[key].owed   += Number(s.amount)
    map[key].eggs   += s.crates * CRATE_SIZE + s.singles
    map[key].sales.push(s)
    if (s.date < map[key].oldest) map[key].oldest = s.date
    const net = (s.crates_loaned||0) - (s.crates_returned||0)
    if (net > 0) {
      map[key].cratesOut += net
      if (!map[key].oldestCrateDate || s.date < map[key].oldestCrateDate)
        map[key].oldestCrateDate = s.date
    }
  }
  return Object.values(map).sort((a,b) => a.oldest > b.oldest ? 1 : -1)
}

export default function CreditTracker({ sales, onMarkPaid, onReturnCrates, showToast }) {
  const debtors   = useMemo(() => computeDebtors(sales), [sales])
  const totalDebt = debtors.reduce((s,d) => s+d.owed, 0)
  const [returning, setReturning] = useState({})  // custKey → { open, qty, saving }

  function getR(key) { return returning[key] || { open: false, qty: '', saving: false } }
  function setR(key, patch) { setReturning(r => ({ ...r, [key]: { ...getR(key), ...patch } })) }

  async function submitReturn(debtor) {
    const key = debtor.name.toLowerCase()
    const qty = parseInt(getR(key).qty, 10)
    if (isNaN(qty) || qty <= 0)          return showToast('Enter a valid number')
    if (qty > debtor.cratesOut)          return showToast(`Only ${debtor.cratesOut} crates out`)
    setR(key, { saving: true })
    try {
      // Distribute returns across sales newest first
      let remaining = qty
      const sorted = [...debtor.sales].sort((a,b) => a.date < b.date ? 1 : -1)
      for (const s of sorted) {
        if (remaining <= 0) break
        const net = (s.crates_loaned||0) - (s.crates_returned||0)
        if (net <= 0) continue
        const apply = Math.min(remaining, net)
        await onReturnCrates(s.id, (s.crates_returned||0) + apply)
        remaining -= apply
      }
      showToast(`${qty} crate(s) returned ✓`)
      setR(key, { open: false, qty: '', saving: false })
    } catch(e) {
      showToast('Error: ' + e.message)
      setR(key, { saving: false })
    }
  }

  if (!debtors.length) return (
    <div className="mx-4 bg-white rounded-2xl border border-gray-200 p-6 text-center">
      <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
      <p className="font-semibold text-gray-700">All clear!</p>
      <p className="text-sm text-gray-400 mt-1">No outstanding balances. Every customer has paid. 🎉</p>
    </div>
  )

  return (
    <div className="mx-4 space-y-3">
      {/* Total banner */}
      <div className="bg-farm-terra-light border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-farm-terra" />
          <span className="text-sm font-semibold text-farm-terra">{debtors.length} debtor{debtors.length!==1?'s':''}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-red-300 uppercase tracking-wider">Total owed</p>
          <p className="num text-lg font-semibold text-farm-terra">{fmtNaira(totalDebt)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap text-[11px] items-center px-1">
        <span className="text-gray-400 font-medium">Overdue:</span>
        {[['badge-green','< 3 days'],['badge-yellow','3–7 days'],['badge-red','7+ days']].map(([cls,lbl]) => (
          <span key={cls} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{lbl}</span>
        ))}
      </div>

      {/* Debtor cards */}
      {debtors.map(d => {
        const { cls, label, tier } = overdueInfo(d.oldest)
        const crateAlert = crateOverdueInfo(d.oldestCrateDate)
        const key = d.name.toLowerCase()
        const r = getR(key)
        return (
          <div key={key} className={`bg-white rounded-2xl border overflow-hidden ${
            tier === 'alert' ? 'border-red-200' : tier === 'warn' ? 'border-amber-200' : 'border-gray-200'}`}>

            {/* Main row */}
            <div className="px-4 py-3.5 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-gray-800 text-sm">{d.name}</span>
                  <span className={`badge text-[10px] ${cls}`}>{label}</span>
                  {crateAlert && (
                    <span className="badge badge-red text-[10px] pulse">{crateAlert.label}</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 flex gap-2.5 flex-wrap">
                  <span>Oldest: {fmtDate(d.oldest)}</span>
                  <span>·</span>
                  <span className="num">{d.eggs.toLocaleString()} eggs</span>
                  <span>·</span>
                  <span>{d.sales.length} sale{d.sales.length!==1?'s':''}</span>
                </div>

                {/* Crate debt row */}
                {d.cratesOut > 0 && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Package size={12} className="text-farm-amber" />
                    <span className="text-[11px] text-farm-amber font-medium">{d.cratesOut} crate{d.cratesOut!==1?'s':''} with buyer</span>
                    <button
                      onClick={() => setR(key, { open: !r.open })}
                      className="text-[11px] text-farm-green font-semibold underline underline-offset-2">
                      Log Return
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Owes</p>
                  <p className="num text-lg font-semibold text-farm-terra">{fmtNaira(d.owed)}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Mark ALL credit sales for ${d.name} as paid?`)) return
                    for (const s of d.sales) await onMarkPaid(s.id)
                    showToast(`${d.name} fully paid ✓`)
                  }}
                  className="bg-farm-green text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-[0.97] transition-all">
                  <PackageCheck size={12} /> Mark Paid
                </button>
              </div>
            </div>

            {/* Crate return input (inline expandable) */}
            {d.cratesOut > 0 && r.open && (
              <div className="px-4 pb-3.5 border-t border-farm-amber-light/60 pt-3 bg-farm-amber-light/20 flex items-center gap-2">
                <Package size={14} className="text-farm-amber flex-shrink-0" />
                <input
                  type="number" inputMode="numeric" min="1" max={d.cratesOut}
                  placeholder={`Max ${d.cratesOut}`}
                  value={r.qty} onChange={e => setR(key, { qty: e.target.value })}
                  className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-amber/30 bg-white"
                  style={{ fontSize: 16 }}
                />
                <button onClick={() => submitReturn(d)} disabled={r.saving}
                  className="bg-farm-amber text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-60 whitespace-nowrap">
                  {r.saving ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
                  Log Return
                </button>
                <button onClick={() => setR(key, { open: false })}
                  className="text-gray-400 hover:text-gray-600 text-sm px-1">✕</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
