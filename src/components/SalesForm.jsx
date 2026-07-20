import React, { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { todayISO, fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { wouldExceedStock } from '../lib/calculations'
import { SkeletonFormWithList } from './Skeleton'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', gray: '#8E8E93' }
const TINT = { green: 'rgba(52,199,89,0.12)', red: 'rgba(255,69,58,0.12)', orange: 'rgba(255,159,10,0.12)' }

export default function SalesForm({ sales = [], cratesInFarm, inStockEggs = 0, customers = [], onSave, onDelete, onMarkPaid, onReturnCrates, onQueueOffline, onAddCustomer, showToast, loading = false }) {
  if (loading) return <SkeletonFormWithList />

  const [open, setOpen] = useState(true)
  const [form, setForm] = useState({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', payment_mode: 'Cash', crates_loaned: '', notes: '' })
  const [error,  setError]  = useState('')
  const [stockBlock, setStockBlock] = useState(null) // popup shown when a sale would exceed real stock
  const [saving, setSaving] = useState(false)
  const [filter, setFilter]       = useState('All')
  const [returningId, setReturningId] = useState(null)
  const [returnQty, setReturnQty]     = useState('')
  const [returning, setReturning]     = useState(false)

  const [custSearch, setCustSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const suggestions = custSearch.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 5)
    : []

  async function handleSubmit() {
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.date)                 return setError('Pick a date.')
    if (!form.amount || isNaN(+form.amount)) return setError('Enter a valid amount.')
    if (form.crates === '' && form.singles === '') return setError('Enter quantity sold.')
    const totalEggs = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
    // A sale can never move more eggs than the farm actually has in stock —
    // block it outright rather than silently letting stock go negative.
    // This is deliberately a popup, not the inline error line — it's a hard
    // stop the person shouldn't be able to miss, unlike a minor field slip.
    if (wouldExceedStock(totalEggs, inStockEggs)) {
      setStockBlock({
        attemptedEggs: totalEggs,
        attemptedCrates: Number(form.crates) || 0,
        attemptedSingles: Number(form.singles) || 0,
        inStockEggs,
        inStockCrates: Math.floor(inStockEggs / CRATE_SIZE),
        inStockSingles: inStockEggs % CRATE_SIZE,
      })
      return
    }
    const loaned = Number(form.crates_loaned) || 0
    if (loaned > cratesInFarm) return setError(`Only ${cratesInFarm} crate(s) available.`)
    setError('')
    setSaving(true)
    const trimmedName = form.customer_name.trim()
    const payload = { date: form.date, customer_name: trimmedName, crates: Number(form.crates)||0, singles: Number(form.singles)||0, amount: Number(form.amount), payment_status: form.payment_status, payment_mode: form.payment_status === 'Paid' ? form.payment_mode : null, crates_loaned: loaned, crates_returned: 0, notes: form.notes.trim(), paid_at: form.payment_status === 'Paid' ? todayISO() : null }
    try {
      // If this name doesn't match an existing customer (case-insensitive),
      // create the customer record too — otherwise sales to new buyers never
      // show up in Customers/Credit tabs even though the sale itself saves fine.
      const isExisting = customers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())
      if (!isExisting && onAddCustomer) {
        await onAddCustomer({ name: trimmedName, whatsapp: null, notes: null })
      }
      await onSave(payload)
      setForm({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', payment_mode: 'Cash', crates_loaned: '', notes: '' })
      showToast('Sale recorded')
    } catch (e) {
      if (onQueueOffline) {
        onQueueOffline(payload)
        setForm({ date: todayISO(), customer_name: '', crates: '', singles: '', amount: '', payment_status: 'Paid', payment_mode: 'Cash', crates_loaned: '', notes: '' })
        showToast('Saved offline')
      } else { setError(e.message) }
    } finally { setSaving(false) }
  }

  async function handleReturn(sale) {
    const qty = parseInt(returnQty)
    const outstanding = sale.crates_loaned - (sale.crates_returned || 0)
    if (!qty || qty < 1)          return showToast('Enter a valid number')
    if (qty > outstanding)        return showToast(`Only ${outstanding} crates outstanding`)
    setReturning(true)
    await onReturnCrates(sale.id, (sale.crates_returned || 0) + qty)
    setReturningId(null)
    setReturnQty('')
    setReturning(false)
    showToast(`${qty} crate${qty !== 1 ? 's' : ''} returned`)
  }

  const total    = (Number(form.crates)||0)*CRATE_SIZE + (Number(form.singles)||0)
  const stockCrates  = Math.floor(inStockEggs / CRATE_SIZE)
  const stockSingles = inStockEggs % CRATE_SIZE
  const filtered = (filter === 'All' ? sales : sales.filter(s => s.payment_status === filter)).slice().sort((a,b) => {
    const dateA = a.created_at || a.date
    const dateB = b.created_at || b.date
    return dateA < dateB ? 1 : -1
  })

  return (
    <div style={cardSurface}>

      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={label}>Sales log</p>
          <span style={countPill}>{sales.length}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: '#8E8E93' }} /> : <ChevronDown size={14} style={{ color: '#8E8E93' }} />}
      </button>

      {open && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2', position: 'relative' }}>
              <label style={fieldLabel}>Customer</label>
              <input type="text" style={fieldInput} placeholder="Type to search or add new…"
                value={custSearch || form.customer_name}
                onChange={e => {
                  setCustSearch(e.target.value)
                  set('customer_name', e.target.value)
                  setShowSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1.5px solid #D1D1D6', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                  {suggestions.map(c => (
                    <button key={c.id} onMouseDown={() => {
                      set('customer_name', c.name)
                      setCustSearch('')
                      setShowSuggestions(false)
                    }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #E5E5EA' }}>
                      <span style={{ fontSize: '14px', color: '#1C1C1E' }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Date</label>
              <input type="date" style={fieldInput} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Payment</label>
              <select style={fieldInput} value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                <option value="Paid">Paid</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            {form.payment_status === 'Paid' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>Payment mode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Cash', 'Transfer', 'POS'].map(key => (
                    <button key={key} type="button"
                      onClick={() => set('payment_mode', key)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        fontSize: 12, fontWeight: 500,
                        border: `1.5px solid ${form.payment_mode === key ? '#1C1C1E' : '#D1D1D6'}`,
                        background: form.payment_mode === key ? '#1C1C1E' : '#FFFFFF',
                        color: form.payment_mode === key ? '#FFFFFF' : '#8E8E93',
                        cursor: 'pointer',
                      }}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={fieldLabel}>Crates sold <span style={{ color: inStockEggs > 0 ? SIGNAL.gray : SIGNAL.red }}>({stockCrates}cr {stockSingles} in stock)</span></label>
              <input type="number" inputMode="numeric" style={fieldInput} placeholder="0" value={form.crates} onChange={e => set('crates', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Singles</label>
              <input type="number" inputMode="numeric" style={fieldInput} placeholder="0" value={form.singles} onChange={e => set('singles', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Amount (₦)</label>
              <input type="number" inputMode="decimal" style={fieldInput} placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Crates loaned <span style={{ color: SIGNAL.orange }}>({cratesInFarm} avail)</span></label>
              <input type="number" inputMode="numeric" style={fieldInput} placeholder="0" min="0" max={cratesInFarm} value={form.crates_loaned} onChange={e => set('crates_loaned', e.target.value)} />
            </div>
          </div>

          {error && <div style={{ marginTop: 10, background: TINT.red, borderRadius: 10, padding: '9px 13px', fontSize: 12, color: SIGNAL.red }}>{error}</div>}

          {total > 0 && form.amount && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#8E8E93' }}>
              {total.toLocaleString()} eggs · <span style={{ color: '#1C1C1E', fontWeight: 500 }}>{fmtNaira(form.amount)}</span>
              {Number(form.crates_loaned) > 0 && <> · <span style={{ color: SIGNAL.orange, fontWeight: 500 }}>{form.crates_loaned} crates loaned</span></>}
            </p>
          )}

          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Record sale
          </button>

          {sales.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                {['All','Paid','Credit'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 99,
                    border: 'none',
                    background: filter===f ? '#1C1C1E' : '#F2F2F7',
                    color: filter===f ? '#FFFFFF' : '#8E8E93', cursor: 'pointer',
                  }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.slice(0,20).map(s => (
                  <div key={s.id} style={{ background: '#F2F2F7', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, color: '#1C1C1E' }}>{s.customer_name}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                            background: s.payment_status==='Paid' ? TINT.green : TINT.red,
                            color: s.payment_status==='Paid' ? SIGNAL.green : SIGNAL.red,
                          }}>
                            {s.payment_status}{s.payment_mode ? ` · ${s.payment_mode}` : ''}
                          </span>
                          {s.isOffline && <span style={offlinePill}>Offline</span>}
                          {(s.crates_loaned-(s.crates_returned||0)) > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: TINT.orange, color: SIGNAL.orange }}>
                              {s.crates_loaned-(s.crates_returned||0)} crates out
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 3 }}>
                          {fmtDate(s.date)} · {(s.crates*CRATE_SIZE+s.singles).toLocaleString()} eggs
                          {s.entered_by && <> · <span style={{ color: '#AEAEB2' }}>{s.entered_by.split('@')[0]}</span></>}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>{fmtNaira(s.amount)}</span>
                        {!s.isOffline && <button onClick={() => onDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: 3 }}><Trash2 size={13} /></button>}
                      </div>
                    </div>

                    {(s.crates_loaned - (s.crates_returned || 0)) > 0 && !s.isOffline && (
                      <div style={{ marginTop: 8 }}>
                        {returningId === s.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number" inputMode="numeric"
                              placeholder={`Max ${s.crates_loaned - (s.crates_returned || 0)}`}
                              value={returnQty}
                              onChange={e => setReturnQty(e.target.value)}
                              style={{ width: 90, padding: '5px 8px', borderRadius: 8, border: '1.5px solid #1C1C1E', fontSize: 13, outline: 'none', background: '#FFFFFF' }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleReturn(s)}
                              disabled={returning}
                              style={{ padding: '5px 10px', borderRadius: 8, background: '#1C1C1E', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                              {returning ? '…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => { setReturningId(null); setReturnQty('') }}
                              style={{ padding: '5px 8px', borderRadius: 8, background: '#FFFFFF', color: '#8E8E93', border: '1.5px solid #D1D1D6', fontSize: 12, cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReturningId(s.id); setReturnQty('') }}
                            style={{ fontSize: 12, color: SIGNAL.orange, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            Record crate return ({s.crates_loaned - (s.crates_returned || 0)} out)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filtered.length > 20 && <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center' }}>+{filtered.length-20} more</p>}
              </div>
            </>
          )}
        </div>
      )}

      {stockBlock && (
        <div style={stockOverlay} onClick={() => setStockBlock(null)}>
          <div style={stockModal} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: TINT.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
              <span style={{ fontSize: 22 }}>🚫</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 500, color: '#1C1C1E', letterSpacing: '-0.02em' }}>
              Not enough stock
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8E8E93', lineHeight: 1.5 }}>
              You're trying to sell <strong style={{ color: '#1C1C1E' }}>{stockBlock.attemptedCrates} crate{stockBlock.attemptedCrates !== 1 ? 's' : ''} + {stockBlock.attemptedSingles}</strong> ({stockBlock.attemptedEggs.toLocaleString()} eggs), but only <strong style={{ color: SIGNAL.red }}>{stockBlock.inStockCrates} crate{stockBlock.inStockCrates !== 1 ? 's' : ''} + {stockBlock.inStockSingles}</strong> ({stockBlock.inStockEggs.toLocaleString()} eggs) is actually in stock.
            </p>
            <button onClick={() => setStockBlock(null)} style={{
              width: '100%', background: '#1C1C1E', color: '#FFFFFF', border: 'none', borderRadius: 12,
              padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
}
const label = { margin: 0, fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const countPill = { fontSize: 11, background: '#F2F2F7', borderRadius: 99, padding: '2px 8px', color: '#8E8E93', fontWeight: 500 }
const fieldLabel = { display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 4 }
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #D1D1D6', fontSize: 16, color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}
const stockOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 20,
  overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  paddingTop: 'max(env(safe-area-inset-top), 20px)',
  paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
}
const stockModal = {
  background: '#FFFFFF', borderRadius: 20, padding: 24,
  width: '100%', maxWidth: 360,
  margin: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}
const primaryBtn = {
  width: '100%', marginTop: 12, padding: '13px', borderRadius: 12,
  background: '#0D0D0D', color: '#FFFFFF', border: 'none',
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const offlinePill = { fontSize: 11, background: '#F2F2F7', color: '#8E8E93', borderRadius: 99, padding: '1px 7px' }