import React, { useState } from 'react'
import { Plus, ShoppingCart, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, fmtNaira, uid, CRATE_SIZE } from '../utils/dateUtils.js'

export default function SalesForm({ sales, cratesInFarm, onSave, onDelete, onMarkPaid, showToast }) {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState({
    date: todayISO(), customer_name: '', crates: '', singles: '',
    amount: '', payment_status: 'Paid', crates_loaned: '', notes: ''
  })
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState('All')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.date)                 return setError('Please pick a date.')
    if (!form.amount || isNaN(+form.amount)) return setError('Enter a valid amount.')
    if (form.crates === '' && form.singles === '') return setError('Enter quantity sold.')
    const loaned = Number(form.crates_loaned) || 0
    if (loaned > cratesInFarm) return setError(`Only ${cratesInFarm} crate(s) available in farm.`)
    setError('')
    setSaving(true)
    try {
      await onSave({
        date:            form.date,
        customer_name:   form.customer_name.trim(),
        crates:          Number(form.crates)  || 0,
        singles:         Number(form.singles) || 0,
        amount:          Number(form.amount),
        payment_status:  form.payment_status,
        crates_loaned:   loaned,
        crates_returned: 0,
        notes:           form.notes.trim(),
        paid_at:         form.payment_status === 'Paid' ? todayISO() : null,
      })
      setForm({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', crates_loaned: '', notes: '' })
      showToast('Sale recorded ✓')
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
  const filtered = (filter === 'All' ? sales : sales.filter(s => s.payment_status === filter))
    .slice().sort((a,b) => a.date < b.date ? 1 : -1)

  return (
    <div className="mx-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-farm-green" />
          <span className="font-semibold text-sm text-gray-800">Sales Log</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full num">{sales.length}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Customer</label>
              <input type="text" className="field" placeholder="e.g. Mama Tunde"
                value={form.customer_name} onChange={e => set('customer_name', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Date</label>
              <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Payment</label>
              <select className="field" value={form.payment_status} onChange={e => set('payment_status', e.target.value)} style={{fontSize:16}}>
                <option value="Paid">✅ Paid</option>
                <option value="Credit">⚠️ Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Crates Sold</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.crates} onChange={e => set('crates', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Singles</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.singles} onChange={e => set('singles', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Amount (₦)</label>
              <input type="number" inputMode="decimal" className="field" placeholder="0"
                value={form.amount} onChange={e => set('amount', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Farm Crates Loaned <span className="normal-case text-farm-amber font-normal">({cratesInFarm} avail)</span>
              </label>
              <input type="number" inputMode="numeric" className="field" placeholder="0" min="0" max={cratesInFarm}
                value={form.crates_loaned} onChange={e => set('crates_loaned', e.target.value)} style={{fontSize:16}} />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {total > 0 && form.amount && (
            <p className="text-xs text-gray-400">
              {total.toLocaleString()} eggs · <span className="num font-semibold text-farm-amber">{fmtNaira(form.amount)}</span>
              {Number(form.crates_loaned) > 0 && <> · <span className="text-farm-amber-mid">{form.crates_loaned} crates loaned</span></>}
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-farm-green text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Record Sale
          </button>

          {/* Filter + list */}
          {sales.length > 0 && (
            <>
              <div className="flex gap-2 pt-1">
                {['All','Paid','Credit'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px]
                      ${filter === f ? 'bg-farm-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filtered.slice(0,20).map(s => (
                  <div key={s.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-800">{s.customer_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            s.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {s.payment_status}
                          </span>
                          {(s.crates_loaned - (s.crates_returned||0)) > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-farm-amber-light text-farm-amber font-medium">
                              {s.crates_loaned - (s.crates_returned||0)} crates out
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {fmtDate(s.date)} · {(s.crates*CRATE_SIZE+s.singles).toLocaleString()} eggs
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="num text-sm font-semibold text-farm-amber">{fmtNaira(s.amount)}</span>
                        <button onClick={() => onDelete(s.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {s.payment_status === 'Credit' && (
                      <button onClick={() => onMarkPaid(s.id)}
                        className="mt-2 text-xs text-farm-green font-semibold underline underline-offset-2">
                        Mark as Paid
                      </button>
                    )}
                  </div>
                ))}
                {filtered.length > 20 && <p className="text-[11px] text-gray-400 text-center">+{filtered.length-20} more</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
