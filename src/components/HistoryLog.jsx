import React, { useState, useMemo } from 'react'
import { History, Download } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from '../utils/exportUtils.js'
import { SkeletonList } from './Skeleton'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', gray: '#8E8E93' }
const TINT = { green: 'rgba(52,199,89,0.12)', red: 'rgba(255,69,58,0.12)', orange: 'rgba(255,159,10,0.12)' }

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function HistoryLog({ sales = [], collections = [], payments = [], onClearAll, showToast, isAdmin, loading = false }) {
  const [tab, setTab] = useState('sales')

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const defaultFrom = firstOfMonth.toISOString().slice(0, 10)

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate,   setToDate]   = useState(today)

  const filteredSales = useMemo(() => {
    return [...sales]
      .filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate))
      .sort((a, b) => a.date < b.date ? 1 : -1)
  }, [sales, fromDate, toDate])

  const filteredCollections = useMemo(() => {
    return [...collections]
      .filter(c => (!fromDate || c.date >= fromDate) && (!toDate || c.date <= toDate))
      .sort((a, b) => {
        const aTime = a.collected_at || a.date
        const bTime = b.collected_at || b.date
        return aTime < bTime ? 1 : -1
      })
  }, [collections, fromDate, toDate])

  const sorted = tab === 'sales' ? filteredSales : filteredCollections

  function clearFilter() { setFromDate(''); setToDate('') }
  function setToday() { setFromDate(today); setToDate(today) }
  function setThisMonth() { setFromDate(defaultFrom); setToDate(today) }

  const hasFilter = fromDate || toDate

  if (loading) {
    return <SkeletonList rows={6} />
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Export */}
      <div style={cardSurface}>
        <p style={label}>Export data</p>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'Sales CSV',       fn:()=>{ exportSalesCSV(sales, payments);  showToast('Sales CSV downloaded')       } },
            { label:'Collections CSV', fn:()=>{ exportCollectionsCSV(collections); showToast('Collections CSV downloaded') } },
          ].map(({label: l,fn}) => (
            <button key={l} onClick={fn} style={chipBtn}>
              <Download size={12}/> {l}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filter */}
      <div style={cardSurface}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <p style={{ ...label, margin:0 }}>Filter by date</p>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={setToday} style={filterChip}>Today</button>
            <button onClick={setThisMonth} style={filterChip}>This month</button>
            {hasFilter && <button onClick={clearFilter} style={{ ...filterChip, background: TINT.red, color: SIGNAL.red }}>Clear</button>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <div>
            <label style={fieldLabel}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={fieldInput} />
          </div>
        </div>
      </div>

      {/* Records */}
      <div style={cardSurface}>
        <div style={{ display:'flex', marginBottom: 12, borderBottom: '0.5px solid #E5E5EA', paddingBottom: 0 }}>
          {[
            ['sales', 'Sales', filteredSales.length, sales.length],
            ['collections', 'Collections', filteredCollections.length, collections.length]
          ].map(([id, lbl, filtered, total]) => (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:'0 0 10px', fontSize:13, fontWeight:500, background:'none', border:'none', cursor:'pointer',
              color: tab===id ? '#1C1C1E' : '#8E8E93',
              borderBottom: tab===id ? '2px solid #1C1C1E' : '2px solid transparent', marginBottom:-1
            }}>
              {lbl} <span style={{ opacity:0.7 }}>({filtered}{filtered !== total ? `/${total}` : ''})</span>
            </button>
          ))}
        </div>

        {hasFilter && sorted.length > 0 && tab === 'sales' && (
          <div style={{ ...summaryRow, marginTop: -12, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            <span style={{ color:'#8E8E93' }}>{filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''}</span>
            <span style={{ fontWeight:500, color: SIGNAL.green }}>
              {String.fromCharCode(0x20A6)}{filteredSales.filter(s => s.payment_status === 'Paid').reduce((s, sale) => s + parseFloat(sale.amount || 0), 0).toLocaleString('en-NG')} paid
            </span>
          </div>
        )}
        {hasFilter && sorted.length > 0 && tab === 'collections' && (
          <div style={{ ...summaryRow, marginTop: -12, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            <span style={{ color:'#8E8E93' }}>{filteredCollections.length} batch{filteredCollections.length !== 1 ? 'es' : ''}</span>
            <span style={{ fontWeight:500, color:'#1C1C1E' }}>
              {filteredCollections.reduce((s, c) => s + (parseInt(c.crates||0)*30+parseInt(c.singles||0)), 0).toLocaleString()} eggs total
            </span>
          </div>
        )}

        <div>
          {sorted.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center' }}>
              <History size={28} style={{ margin:'0 auto 10px', color:'#E5E5EA' }}/>
              <p style={{ fontSize:13, color:'#8E8E93' }}>
                {hasFilter ? 'No records for selected dates' : 'No records yet'}
              </p>
            </div>
          )}
          {sorted.map((item, idx) => (
            tab === 'sales' ? (
              <div key={item.id} style={{ padding:'13px 0', borderBottom:idx<sorted.length-1?'0.5px solid #E5E5EA':'none', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, color:'#1C1C1E', margin: 0 }}>{item.customer_name}</p>
                  <p style={{ fontSize:12, color:'#8E8E93', marginTop:2 }}>{fmtDate(item.date)} · {(item.crates*CRATE_SIZE+item.singles).toLocaleString()} eggs</p>
                  <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99,
                      background: item.payment_status==='Paid' ? TINT.green : TINT.red,
                      color: item.payment_status==='Paid' ? SIGNAL.green : SIGNAL.red,
                    }}>
                      {item.payment_status}
                    </span>
                    {item.crates_loaned > 0 && (
                      <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99, background: TINT.orange, color: SIGNAL.orange }}>
                        {item.crates_loaned} loaned, {item.crates_returned||0} back
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:14, fontWeight:500, color:'#1C1C1E', flexShrink:0 }}>{fmtNaira(item.amount)}</span>
              </div>
            ) : (
              <div key={item.id} style={{ padding:'13px 0', borderBottom:idx<sorted.length-1?'0.5px solid #E5E5EA':'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ fontSize:14, color:'#1C1C1E', margin: 0 }}>{fmtDate(item.date)}</p>
                    {item.collected_at && (
                      <span style={{ fontSize:12, color:'#8E8E93' }}>· {fmtTime(item.collected_at)}</span>
                    )}
                  </div>
                  <p style={{ fontSize:12, color:'#8E8E93', marginTop:2 }}>
                    {(parseInt(item.crates*CRATE_SIZE)+parseInt(item.singles||0)).toLocaleString()} eggs
                    {item.notes ? ` · ${item.notes}` : ''}
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:14, fontWeight:500, color:'#1C1C1E', display:'block' }}>
                    {item.crates} crate{parseInt(item.crates)!==1?'s':''}
                  </span>
                  {parseInt(item.singles) > 0 && (
                    <span style={{ fontSize:12, color:'#8E8E93' }}>+{item.singles} singles</span>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {isAdmin && <DangerZone onClearAll={onClearAll} />}
    </div>
  )
}

function DangerZone({ onClearAll }) {
  const [confirming, setConfirming] = useState(false)
  const [clearing,   setClearing]   = useState(false)

  async function handleClear() {
    setClearing(true)
    await onClearAll()
    setClearing(false)
    setConfirming(false)
  }

  return (
    <div style={{ ...cardSurface, border: `1.5px solid ${SIGNAL.red}` }}>
      <p style={{ fontSize:12, fontWeight:500, color: SIGNAL.red, marginBottom:4 }}>Danger zone</p>
      <p style={{ fontSize:12, color:'#8E8E93', marginBottom:12 }}>Export your data before clearing. This cannot be undone.</p>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} style={dangerBtn}>Clear all data</button>
      ) : (
        <div style={{ background: TINT.red, borderRadius:10, padding:'14px' }}>
          <p style={{ fontSize:13, fontWeight:500, color: SIGNAL.red, margin:'0 0 8px' }}>
            Are you sure? This will permanently delete all sales, collections, expenses and payments.
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleClear} disabled={clearing} style={{ ...dangerBtn, flex: 1, opacity: clearing ? 0.7 : 1 }}>
              {clearing ? 'Clearing…' : 'Yes, delete everything'}
            </button>
            <button onClick={() => setConfirming(false)} style={cancelBtn}>Cancel</button>
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
const label = { margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const chipBtn = {
  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
  background:'#F2F2F7', border:'none', borderRadius:10, padding:'10px 0',
  fontSize:12, fontWeight:500, color:'#8E8E93', cursor:'pointer'
}
const filterChip = {
  padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500,
  background:'#F2F2F7', color:'#8E8E93', border:'none', cursor:'pointer'
}
const fieldLabel = { display:'block', fontSize:12, color:'#8E8E93', marginBottom:'4px' }
const fieldInput = {
  width:'100%', padding:'8px 10px', borderRadius:'8px',
  border:'1.5px solid #D1D1D6', fontSize:'13px', color:'#1C1C1E',
  outline:'none', boxSizing:'border-box', background:'#FFFFFF'
}
const summaryRow = {
  padding:'10px 0', background:'#F2F2F7', display:'flex', justifyContent:'space-between', fontSize:'12px'
}
const dangerBtn = {
  width:'100%', padding:'12px', borderRadius:10, background: SIGNAL.red, color:'#FFFFFF',
  border:'none', fontWeight:500, fontSize:13, cursor:'pointer'
}
const cancelBtn = {
  padding:'12px 16px', borderRadius:10, background:'#FFFFFF', color:'#8E8E93',
  border:'1.5px solid #D1D1D6', fontWeight:500, fontSize:13, cursor:'pointer'
}
