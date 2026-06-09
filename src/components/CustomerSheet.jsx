import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'

function buildWhatsAppUrl(name, owed, oldestDate) {
  const msg = `Hi ${name}, this is a reminder that you have an outstanding balance of ${fmtNaira(owed)} for eggs purchased on ${fmtDate(oldestDate)}. Kindly settle at your earliest convenience. Thank you — ROKDIV Farm.`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

export default function CustomerSheet({ customer, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!customer) return null

  const { name, sales = [], owed = 0, oldest } = customer
  const sorted       = [...sales].sort((a, b) => b.date.localeCompare(a.date))
  const totalEggs    = sales.reduce((s, sale) => s + sale.crates * CRATE_SIZE + sale.singles, 0)
  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.amount), 0)
  const waUrl        = owed > 0 ? buildWhatsAppUrl(name, owed, oldest) : null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }} />

      {/* Sheet */}
      <div className="sheet-in" style={{
        position:'fixed', bottom:0, left:0, right:0,
        maxWidth:480, margin:'0 auto', zIndex:70,
        background:'#FFFFFF',
        borderRadius:'20px 20px 0 0',
        maxHeight:'82vh',
        display:'flex', flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.18)',
        border:'1px solid #F3F4F6',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ padding:'8px 20px 14px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#111827', marginBottom:4 }}>{name}</h2>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'#6B7280' }}>
                <span className="num" style={{ color:'#4F6EF7', fontWeight:700 }}>{sales.length}</span> sales
              </span>
              <span style={{ fontSize:12, color:'#6B7280' }}>
                <span className="num" style={{ color:'#059669', fontWeight:700 }}>{totalEggs.toLocaleString()}</span> eggs
              </span>
              <span style={{ fontSize:12, color:'#6B7280' }}>
                <span className="num" style={{ color:'#D97706', fontWeight:700 }}>{fmtNaira(totalRevenue)}</span> total
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'#F3F4F6', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280', cursor:'pointer' }}>
            <X size={15} />
          </button>
        </div>

        {/* WhatsApp */}
        {waUrl && (
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', background:'#F0FDF4' }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="wa-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.118 1.532 5.845L.057 23.714a.5.5 0 0 0 .611.637l6.053-1.592A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.508-5.232-1.394l-.374-.217-3.893 1.024 1.007-3.774-.235-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Send Payment Reminder
            </a>
            <p style={{ fontSize:10, color:'#6B7280', marginTop:6 }}>
              Opens WhatsApp with pre-filled message · Owes {fmtNaira(owed)}
            </p>
          </div>
        )}

        {/* Transactions */}
        <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
          {sorted.length === 0
            ? <p style={{ textAlign:'center', color:'#9CA3AF', fontSize:13, padding:32 }}>No transactions yet</p>
            : sorted.map((s, idx) => (
              <div key={s.id} style={{ padding:'12px 20px', borderBottom: idx < sorted.length-1 ? '1px solid #F3F4F6' : 'none', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{fmtDate(s.date)}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:s.payment_status==='Paid'?'#ECFDF5':'#FFFBEB', color:s.payment_status==='Paid'?'#059669':'#D97706', border:`1px solid ${s.payment_status==='Paid'?'#A7F3D0':'#FDE68A'}` }}>
                      {s.payment_status}
                    </span>
                    {s.isOffline && <span className="badge-offline">💾 Offline</span>}
                  </div>
                  <p style={{ fontSize:11, color:'#9CA3AF' }}>
                    {s.crates} crates + {s.singles} singles · <span className="num">{(s.crates*CRATE_SIZE+s.singles).toLocaleString()} eggs</span>
                  </p>
                  {s.notes && <p style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{s.notes}</p>}
                </div>
                <span className="num" style={{ fontSize:13, fontWeight:700, color:'#D97706', flexShrink:0 }}>{fmtNaira(s.amount)}</span>
              </div>
            ))
          }
        </div>

        <div style={{ height:'env(safe-area-inset-bottom, 12px)', background:'#fff' }} />
      </div>
    </>
  )
}
