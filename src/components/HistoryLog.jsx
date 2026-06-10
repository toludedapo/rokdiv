// HistoryLog.jsx
import React, { useState } from 'react'
import { History, Download } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from '../utils/exportUtils.js'

export default function HistoryLog({ sales, collections, onClearAll, showToast, isAdmin }) {
  const [tab, setTab] = useState('sales')
  const sorted = tab === 'sales'
    ? [...sales].sort((a,b) => a.date < b.date ? 1 : -1)
    : [...collections].sort((a,b) => a.date < b.date ? 1 : -1)

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
            <button key={label} onClick={fn} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'#F8F9FB', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'10px 0', fontSize:12, fontWeight:600, color:'#6B7280', cursor:'pointer', transition:'all 0.15s' }}>
              <Download size={12}/> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Records */}
      <div style={card}>
        <div style={{ display:'flex', borderBottom:'1px solid #F3F4F6' }}>
          {[['sales','Sales',sales.length],['collections','Collections',collections.length]].map(([id,lbl,count]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'13px 0', fontSize:12, fontWeight:700, background:'none', border:'none', cursor:'pointer', color:tab===id?'#4F6EF7':'#9CA3AF', borderBottom:tab===id?'2px solid #4F6EF7':'2px solid transparent', marginBottom:-1, transition:'all 0.15s' }}>
              {lbl} <span style={{ fontFamily:'JetBrains Mono, monospace', opacity:0.8 }}>({count})</span>
            </button>
          ))}
        </div>
        <div>
          {sorted.length === 0 && (
            <div style={{ padding:'40px 24px', textAlign:'center' }}>
              <History size={28} style={{ margin:'0 auto 10px', color:'#E5E7EB' }}/>
              <p style={{ fontSize:13, color:'#9CA3AF' }}>No records yet</p>
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
                    {item.isOffline && <span className="badge-offline">💾 Offline</span>}
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
                  <p style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{fmtDate(item.date)}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{item.crates} crates + {item.singles} singles{item.notes?` · ${item.notes}`:''}</p>
                </div>
                <span className="num" style={{ fontSize:13, fontWeight:700, color:'#059669' }}>{(item.crates*CRATE_SIZE+item.singles).toLocaleString()}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Danger zone - admin only */}
      {isAdmin && (
        <DangerZone onClearAll={onClearAll} />
      )}
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

  const card = {
    background: '#FFFFFF', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1.5px solid #FECACA', overflow: 'hidden'
  }

  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Danger Zone</p>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>Export your data before clearing. This cannot be undone.</p>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="btn-danger">
          Clear All Data
        </button>
      ) : (
        <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '14px', border: '1px solid #FECACA' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', margin: '0 0 8px' }}>
            Are you sure? This will permanently delete all sales, collections, expenses and payments.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleClear}
              disabled={clearing}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, background: '#DC2626',
                color: 'white', border: 'none', fontWeight: 700, fontSize: 13,
                cursor: clearing ? 'not-allowed' : 'pointer', opacity: clearing ? 0.7 : 1
              }}>
              {clearing ? 'Clearing...' : 'Yes, Delete Everything'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{
                padding: '10px 16px', borderRadius: 10, background: 'white',
                color: '#6B7280', border: '1px solid #E5E7EB', fontWeight: 600,
                fontSize: 13, cursor: 'pointer'
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}