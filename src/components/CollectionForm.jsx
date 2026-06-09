import React, { useState } from 'react'
import { Plus, Egg, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, uid, CRATE_SIZE } from '../utils/dateUtils.js'

export default function CollectionForm({ collections, onSave, onDelete, showToast }) {
  const [open,   setOpen]   = useState(true)
  const [form,   setForm]   = useState({ date: todayISO(), crates: '', singles: '', notes: '' })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.date)                                     return setError('Please pick a date.')
    if (form.crates === '' && form.singles === '')       return setError('Enter at least crates or singles.')
    setError('')
    setSaving(true)
    try {
      await onSave({ date: form.date, crates: Number(form.crates)||0, singles: Number(form.singles)||0, notes: form.notes.trim() })
      setForm({ date: todayISO(), crates: '', singles: '', notes: '' })
      showToast('Collection logged ✓')
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total  = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
  const sorted = [...collections].sort((a,b) => a.date < b.date ? 1 : -1)

  return (
    <div className="mx-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-2">
          <Egg size={16} className="text-farm-amber" />
          <span className="font-semibold text-sm text-gray-800">Collection Log</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full num">{collections.length}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Date</label>
              <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Crates (×{CRATE_SIZE})</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.crates} onChange={e => set('crates', e.target.value)} style={{fontSize:16}} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Singles</label>
              <input type="number" inputMode="numeric" className="field" placeholder="0"
                value={form.singles} onChange={e => set('singles', e.target.value)} style={{fontSize:16}} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Notes (optional)</label>
              <input type="text" className="field" placeholder="e.g. Morning batch"
                value={form.notes} onChange={e => set('notes', e.target.value)} style={{fontSize:16}} />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {total > 0 && <p className="text-xs text-gray-400">Total: <span className="num font-semibold text-farm-green">{total.toLocaleString()} eggs</span></p>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-farm-green text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Log Collection
          </button>

          {sorted.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Recent Entries</p>
              {sorted.slice(0,8).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{fmtDate(c.date)}</p>
                    <p className="text-[11px] text-gray-400">{c.notes || `${c.crates} crates + ${c.singles} singles`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-farm-green">{(c.crates*CRATE_SIZE+c.singles).toLocaleString()}</span>
                    <button onClick={() => onDelete(c.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {sorted.length > 8 && <p className="text-[11px] text-gray-400 text-center">+{sorted.length-8} older entries</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
