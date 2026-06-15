import React, { useState, useMemo } from 'react'
import { History, Download } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from '../utils/exportUtils.js'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function HistoryLog({ sales, collections, onClearAll, showToast, isAdmin }) {
  const [tab, setTab] = useState('sales')

  // ── Date filter state ────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const defaultFrom = firstOfMonth.toISOString().slice(0, 10)

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate,   setToDate]   = useState(today)

  // ── Filtered records ─────────────────────────────────────────────────────
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

  function clearFilter() {
    setFromDate('')
    setToDate('')
  }

  function setToday() {
    setFromDate(today)
    setToDate(today)
  }

  function setThisMonth() {
    setFromDate(defaultFrom)
    setToDate(today)
  }

  const hasFilter = fromDate || toDate

  const card = { background:'#FFFFFF', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1.5px solid #F3F4F6', overflow:'hidden' }

  return (
    <div className="mx-4" style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Export */}
      <div style={{ ...card, padding:'16px 18px' }}>
        <p className="label" style={{ marginBottom:10 }}>Export Data</p>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'Sales CSV',       fn:()=>{ exportSalesCSV(sales);            showToast('Sales CSV downloaded')       } },
            { label:'Collections CSV', fn:()=>{ exportCollectionsCSV(collections); showToast('Collections CSV downloaded') } },
          ].map(({label,fn}) => (
            <button key={label} onClick={fn} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'#F8F9FB', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'10px 0', fontSize:12, fontWeight:600, color:'#6B7280', cursor:'pointer' }}>
              <Download size={12}/> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ ...card, padding:'14px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <p className="label" style={{ margin:0 }}>Filter by Date</p>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={setToday} style={filterChip}>Today</button>
            <button onClick={setThisMonth} style={filterChip}>This Month</button>
            {hasFilter && <button onClick={clearFilter} style={{ ...filterChip, background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA' }}>Clear</button>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <div>
            <label style={lblStyle}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={dateInputStyle} />
          </div>
          <div>
            <label style={lblStyle}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={dateInputStyle} />
          </div>
        </div>
      </div>

      {/* Records */}
      <div style={card}>
        <div style={{ display:'flex', borderBottom:'1px solid #F3F4F6' }}>
          {[
            ['sales', 'Sales', filteredSales.length, sales.length],
            ['collections', 'Collections', filteredCollections.length, collections.length]
          ].map(([id, lbl, filtered, total]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'13px 0', fontSize:12, fontWeight:700, background:'none', border:'none', cursor:'pointer', color:tab===id?'#4F6EF7':'#9CA3AF', borderBottom:tab===id?'2px solid #4F6EF7':'2px solid transparent', marginBottom:-1 }}>
              {lbl} <span style={{ fontFamily:'JetBrains Mono, monospace', opacity:0.8 }}>
                ({filtered}{filtered !== total ? `/${total}` : ''})
              </span>
            </button>
          ))}
        </div>

        {/* Summary row when filtered */}
        {hasFilter && sorted.length > 0 && tab === 'sales' && (
          <div style={{ padding:'10px 18px', background:'#F8F9FB', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
            <span style={{ color:'#6B7280' }}>{filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''}</span>
            <span style={{ fontWeight:700, color:'#10B981' }}>
              {String.fromCharCode(0x20A6)}{filteredSales.reduce((s, sale) => s + parseFloat(sale.amount || 0), 0).toLocaleString('en-NG')} total
            </span>
          </div>
        )}
        {hasFilter && sorted.length > 0 && tab === 'collections' && (
          <div style={{ padding:'10px 18px', background:'#F8F9FB', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
            <span style={{ color:'#6B7280' }}>{filteredCollections.length} batch{filteredCollections.length !== 1 ? 'es' : ''}</span>
            <span style={{ fontWeight:700, color:'#059669' }}>
              {filteredCollections.reduce((s, c) => s + (parseInt(c.crates||0)*30+parseInt(c.singles||0)), 0).toLocaleString()} eggs total
            </span>
          </div>
        )}

        <div>
          {sorted.length === 0 && (
            <div style={{ padding:'40px 24px', textAlign:'center' }}>
              <History size={28} style={{ margin:'0 auto 10px', color:'#E5E7EB' }}/>
              <p style={{ fontSize:13, color:'#9CA3AF' }}>
                {hasFilter ? 'No records for selected dates' : 'No records yet'}
              </p>
            </div>
          )}
          {sorted.map((item, idx) => (
            tab === 'sales' ? (
              <div key={item.id} style={{ padding:'13px 18px', borderBottom:idx<sorted.length-1?'1px solid #F3F4F6':'none', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{item.customer_name}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{fmtDate(item.date)} · {(item.crates*CRATE_SIZE+item.singles).toLocaleString()} eggs</p>
                  <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:item.payment_status==='Paid'?'#ECFDF5':'#FFFBEB', color:item.payment_status==='Paid'?'#059669':'#D97706', border:`1px solid ${item.payment_status==='Paid'?'#A7F3D0':'#FDE68A'}` }}>
                      {item.payment_status}
                    </span>
                    {item.crates_loaned > 0 && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A' }}>
                        {item.crates_loaned} loaned, {item.crates_returned||0} back
                      </span>
                    )}
                  </div>
                </div>
                <span className="num" style={{ fontSize:13, fontWeight:700, color:'#D97706', flexShrink:0 }}>{fmtNaira(item.amount)}</span>
              </div>
            ) : (
              <div key={item.id} style={{ padding:'13px 18px', borderBottom:idx<sorted.length-1?'1px solid #F3F4F6':'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{fmtDate(item.date)}</p>
                    {item.collected_at && (
                      <span style={{ fontSize:11, color:'#9CA3AF' }}>· {fmtTime(item.collected_at)}</span>
                    )}
                  </div>
                  <p style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>
                    {item.crates} crates + {item.singles} singles
                    {item.notes ? ` · ${item.notes}` : ''}
                  </p>
                </div>
                <span className="num" style={{ fontSize:13, fontWeight:700, color:'#059669' }}>{(item.crates*CRATE_SIZE+item.singles).toLocaleString()}</span>
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

  const card = { background:'#FFFFFF', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1.5px solid #FECACA', overflow:'hidden' }

  return (
    <div style={{ ...card, padding:'16px 18px' }}>
      <p style={{ fontSize:12, fontWeight:700, color:'#DC2626', marginBottom:4 }}>Danger Zone</p>
      <p style={{ fontSize:11, color:'#9CA3AF', marginBottom:12 }}>Export your data before clearing. This cannot be undone.</p>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="btn-danger">Clear All Data</button>
      ) : (
        <div style={{ background:'#FEF2F2', borderRadius:10, padding:'14px', border:'1px solid #FECACA' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#DC2626', margin:'0 0 8px' }}>
            Are you sure? This will permanently delete all sales, collections, expenses and payments.
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleClear} disabled={clearing}
              style={{ flex:1, padding:'10px', borderRadius:10, background:'#DC2626', color:'white', border:'none', fontWeight:700, fontSize:13, cursor:clearing?'not-allowed':'pointer', opacity:clearing?0.7:1 }}>
              {clearing ? 'Clearing...' : 'Yes, Delete Everything'}
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ padding:'10px 16px', borderRadius:10, background:'white', color:'#6B7280', border:'1px solid #E5E7EB', fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const filterChip = {
  padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
  background:'#F3F4F6', color:'#6B7280', border:'1px solid #E5E7EB', cursor:'pointer'
}
const lblStyle = {
  display:'block', fontSize:'10px', fontWeight:600, color:'#9CA3AF',
  marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em'
}
const dateInputStyle = {
  width:'100%', padding:'8px 10px', borderRadius:'8px',
  border:'1.5px solid #E5E7EB', fontSize:'13px', color:'#111827',
  outline:'none', boxSizing:'border-box', background:'#FAFAFA'
}