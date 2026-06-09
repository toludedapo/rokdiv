import React, { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Package, PackageCheck, Loader2, CreditCard, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { fmtDate, fmtNaira, overdueInfo, crateOverdueInfo, CRATE_SIZE, todayISO } from '../utils/dateUtils.js'
import CustomerSheet from './CustomerSheet.jsx'

export function computeDebtors(sales, payments = []) {
  const creditSales = sales.filter(s => s.payment_status === 'Credit')
  const paidBySale  = {}
  for (const p of payments) paidBySale[p.sale_id] = (paidBySale[p.sale_id] || 0) + Number(p.amount)
  const map = {}
  for (const s of creditSales) {
    const key = s.customer_name?.trim().toLowerCase()
    if (!key) continue
    const bal = Math.max(0, Number(s.amount) - (paidBySale[s.id] || 0))
    if (!map[key]) map[key] = { name: s.customer_name.trim(), owed: 0, eggs: 0, oldest: s.date, sales: [], cratesOut: 0, oldestCrateDate: null, totalPaid: 0, totalAmount: 0 }
    map[key].totalAmount += Number(s.amount)
    map[key].totalPaid   += (paidBySale[s.id] || 0)
    map[key].owed        += bal
    map[key].eggs        += s.crates * CRATE_SIZE + s.singles
    map[key].sales.push({ ...s, balance: bal, paid: paidBySale[s.id] || 0 })
    if (s.date < map[key].oldest) map[key].oldest = s.date
    const net = (s.crates_loaned||0) - (s.crates_returned||0)
    if (net > 0) { map[key].cratesOut += net; if (!map[key].oldestCrateDate || s.date < map[key].oldestCrateDate) map[key].oldestCrateDate = s.date }
  }
  return Object.values(map).filter(d => d.owed > 0).sort((a,b) => a.oldest > b.oldest ? 1 : -1)
}

function buildAllCustomers(sales, payments = []) {
  const paidBySale = {}
  for (const p of payments) paidBySale[p.sale_id] = (paidBySale[p.sale_id] || 0) + Number(p.amount)
  const map = {}
  for (const s of sales) {
    const key = s.customer_name?.trim().toLowerCase()
    if (!key) continue
    if (!map[key]) map[key] = { name: s.customer_name.trim(), sales: [], owed: 0, oldest: s.date }
    map[key].sales.push(s)
    if (s.payment_status === 'Credit') map[key].owed += Math.max(0, Number(s.amount) - (paidBySale[s.id] || 0))
    if (s.date < map[key].oldest) map[key].oldest = s.date
  }
  return map
}

export default function CreditTracker({ sales, payments = [], onMarkPaid, onReturnCrates, onAddPayment, showToast }) {
  const debtors   = useMemo(() => computeDebtors(sales, payments), [sales, payments])
  const allCust   = useMemo(() => buildAllCustomers(sales, payments), [sales, payments])
  const totalDebt = debtors.reduce((s, d) => s + d.owed, 0)
  const [state,         setState]         = useState({})
  const [sheetCustomer, setSheetCustomer] = useState(null)

  function getS(key) { return state[key] || { crateOpen:false, payOpen:false, crateQty:'', payAmt:'', payNotes:'', payMethod:'Cash', saving:false } }
  function setS(key, patch) { setState(s => ({ ...s, [key]: { ...getS(key), ...patch } })) }

  function openSheet(name) {
    const k = name.trim().toLowerCase()
    if (allCust[k]) setSheetCustomer(allCust[k])
  }

  async function submitReturn(debtor) {
    const key = debtor.name.toLowerCase()
    const qty = parseInt(getS(key).crateQty, 10)
    if (isNaN(qty)||qty<=0) return showToast('Enter a valid crate count')
    if (qty>debtor.cratesOut) return showToast(`Only ${debtor.cratesOut} crates out`)
    setS(key,{saving:true})
    try {
      let rem = qty
      for (const s of [...debtor.sales].sort((a,b)=>a.date<b.date?1:-1)) {
        if (rem<=0) break
        const net=(s.crates_loaned||0)-(s.crates_returned||0)
        if (net<=0) continue
        const apply=Math.min(rem,net)
        await onReturnCrates(s.id,(s.crates_returned||0)+apply)
        rem-=apply
      }
      showToast(`${qty} crate${qty!==1?'s':''} returned`)
      setS(key,{saving:false,crateOpen:false,crateQty:''})
    } catch(e) { showToast('Error: '+e.message); setS(key,{saving:false}) }
  }

  async function submitPayment(debtor) {
    const key = debtor.name.toLowerCase()
    const s   = getS(key)
    const amt = Number(s.payAmt)
    if (!amt||amt<=0) return showToast('Enter a valid amount')
    if (amt>debtor.owed) return showToast(`Max ${fmtNaira(debtor.owed)}`)
    setS(key,{saving:true})
    const noteText = [s.payMethod||'Cash', s.payNotes.trim()].filter(Boolean).join(' - ')
    try {
      let rem = amt
      for (const sale of [...debtor.sales].sort((a,b)=>a.date>b.date?1:-1)) {
        if (rem<=0) break
        if (sale.balance<=0) continue
        const apply=Math.min(rem,sale.balance)
        await onAddPayment({sale_id:sale.id,amount:apply,date:todayISO(),notes:noteText||null})
        rem-=apply
      }
      showToast(`${s.payMethod||'Cash'} payment of ${fmtNaira(amt)} recorded`)
      setS(key,{saving:false,payOpen:false,payAmt:'',payNotes:'',payMethod:'Cash'})
    } catch(e) { showToast('Error: '+e.message); setS(key,{saving:false}) }
  }

  if (!debtors.length) return (
    <>
      <div className="mx-4" style={{ background:'#FFFFFF', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1.5px solid #F3F4F6', padding:'32px 24px', textAlign:'center' }}>
        <div style={{width:56,height:56,borderRadius:16,background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
          <CheckCircle size={28} style={{color:'#059669'}}/>
        </div>
        <p style={{fontSize:15,fontWeight:700,color:'#111827'}}>All clear!</p>
        <p style={{fontSize:13,color:'#9CA3AF',marginTop:4}}>No outstanding balances.</p>
      </div>
      <CustomerDirectory customers={allCust} onOpen={openSheet}/>
      {sheetCustomer && <CustomerSheet customer={sheetCustomer} onClose={()=>setSheetCustomer(null)}/>}
    </>
  )

  return (
    <>
      <div className="mx-4" style={{display:'flex',flexDirection:'column',gap:12}}>

        {/* Banner */}
        <div style={{background:'#FEF2F2',border:'1.5px solid #FECACA',borderRadius:16,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(220,38,38,0.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:32,height:32,borderRadius:10,background:'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <AlertCircle size={16} style={{color:'#DC2626'}}/>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:'#DC2626'}}>{debtors.length} debtor{debtors.length!==1?'s':''}</span>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:9,color:'#EF4444',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Total owed</p>
            <p className="num" style={{fontSize:20,fontWeight:700,color:'#DC2626'}}>{fmtNaira(totalDebt)}</p>
          </div>
        </div>

        {/* Legend */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',paddingLeft:2}}>
          <span style={{fontSize:10,color:'#9CA3AF',fontWeight:600}}>Age:</span>
          {[['badge-green','< 3 days'],['badge-yellow','3-7 days'],['badge-red','7+ days']].map(([cls,lbl])=>(
            <span key={cls} className={cls}>{lbl}</span>
          ))}
        </div>

        {/* Debtor cards */}
        {debtors.map(d => {
          const {cls,label,tier} = overdueInfo(d.oldest)
          const crateAlert = crateOverdueInfo(d.oldestCrateDate)
          const key  = d.name.toLowerCase()
          const s    = getS(key)
          const pct  = d.totalAmount > 0 ? Math.round((d.totalPaid/d.totalAmount)*100) : 0

          return (
            <div key={key} style={{background:'#FFFFFF',borderRadius:16,border:`1.5px solid ${tier==='alert'?'#FECACA':tier==='warn'?'#FDE68A':'#F3F4F6'}`,boxShadow:'0 2px 12px rgba(0,0,0,0.07)',overflow:'hidden'}}>
              <div style={{padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                      <button onClick={()=>openSheet(d.name)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                        <span style={{fontSize:14,fontWeight:700,color:'#111827',textDecoration:'underline',textUnderlineOffset:3,textDecorationStyle:'dotted',textDecorationColor:'#D1D5DB'}}>{d.name}</span>
                        <ExternalLink size={11} style={{color:'#9CA3AF'}}/>
                      </button>
                      <span className={cls}>{label}</span>
                      {crateAlert && <span className="badge-red pulse">{crateAlert.label}</span>}
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:11,color:'#9CA3AF'}}>
                      <span>Since {fmtDate(d.oldest)}</span><span>·</span>
                      <span className="num">{d.eggs.toLocaleString()} eggs</span><span>·</span>
                      <span>{d.sales.length} sale{d.sales.length!==1?'s':''}</span>
                    </div>
                    {d.totalPaid > 0 && (
                      <div style={{marginTop:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:10,color:'#6B7280'}}>Paid: <span className="num" style={{color:'#059669',fontWeight:700}}>{fmtNaira(d.totalPaid)}</span></span>
                          <span className="num" style={{fontSize:10,color:'#059669',fontWeight:700}}>{pct}%</span>
                        </div>
                        <div className="progress-track"><div className="progress-fill-green progress-fill" style={{width:`${pct}%`}}/></div>
                      </div>
                    )}
                    {d.cratesOut > 0 && (
                      <div style={{marginTop:10,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                        <Package size={12} style={{color:'#D97706'}}/>
                        <span style={{fontSize:11,color:'#D97706',fontWeight:600}}>{d.cratesOut} crate{d.cratesOut!==1?'s':''} with buyer</span>
                        <button onClick={()=>setS(key,{crateOpen:!s.crateOpen,payOpen:false})} style={{fontSize:11,color:'#4F6EF7',fontWeight:700,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:3,padding:0}}>Log Return</button>
                      </div>
                    )}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8,flexShrink:0}}>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:9,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>Owes</p>
                      <p className="num" style={{fontSize:18,fontWeight:700,color:'#DC2626'}}>{fmtNaira(d.owed)}</p>
                    </div>
                    <button onClick={()=>setS(key,{payOpen:!s.payOpen,crateOpen:false})} style={{fontSize:11,fontWeight:700,padding:'7px 12px',borderRadius:10,border:'1.5px solid #C7D2FE',background:s.payOpen?'#EEF1FF':'#F5F7FF',color:'#4F6EF7',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                      <CreditCard size={11}/> Part Pay {s.payOpen?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                    </button>
                    <button onClick={async()=>{if(!window.confirm(`Mark ALL credit sales for ${d.name} as paid?`))return;for(const sale of d.sales)await onMarkPaid(sale.id);showToast(`${d.name} fully paid`)}} style={{fontSize:11,fontWeight:700,padding:'7px 12px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#4F6EF7,#3B55E0)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(79,110,247,0.3)'}}>
                      <PackageCheck size={11}/> Fully Paid
                    </button>
                  </div>
                </div>
              </div>

              {/* Part pay */}
              {s.payOpen && (
                <div className="slide-up" style={{borderTop:'1px solid #EEF1FF',background:'#F5F7FF',padding:'14px 18px'}}>
                  <p style={{fontSize:11,fontWeight:700,color:'#4F6EF7',marginBottom:10}}>Record Partial Payment</p>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div>
                      <label className="label">Amount received (₦)</label>
                      <input type="number" inputMode="decimal" placeholder={`Max ${fmtNaira(d.owed)}`} value={s.payAmt} onChange={e=>setS(key,{payAmt:e.target.value})} className="field" style={{fontSize:16}} autoFocus/>
                    </div>
                    <div>
                      <label className="label">Payment method</label>
                      <div style={{display:'flex',gap:6}}>
                        {[{val:'Cash',emoji:'💵'},{val:'Transfer',emoji:'📲'},{val:'Other',emoji:'•••'}].map(({val,emoji})=>{
                          const active=(s.payMethod||'Cash')===val
                          return <button key={val} type="button" onClick={()=>setS(key,{payMethod:val})} style={{flex:1,padding:'9px 0',borderRadius:10,border:active?'none':'1.5px solid #E5E7EB',background:active?'linear-gradient(135deg,#4F6EF7,#3B55E0)':'#fff',color:active?'#fff':'#6B7280',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                            <span style={{fontSize:val==='Other'?11:14}}>{emoji}</span>{val}
                          </button>
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="label">Note (optional)</label>
                      <input type="text" placeholder={(s.payMethod||'Cash')==='Transfer'?'e.g. GTBank ref 123':'e.g. Paid at farm'} value={s.payNotes} onChange={e=>setS(key,{payNotes:e.target.value})} className="field" style={{fontSize:16}}/>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>submitPayment(d)} disabled={s.saving} className="btn-primary" style={{flex:1,padding:'11px 0'}}>
                        {s.saving?<Loader2 size={13} className="animate-spin"/>:<CreditCard size={13}/>} Save Payment
                      </button>
                      <button onClick={()=>setS(key,{payOpen:false,payAmt:'',payNotes:''})} style={{background:'#F3F4F6',border:'1.5px solid #E5E7EB',borderRadius:12,padding:'11px 14px',fontSize:12,color:'#6B7280',cursor:'pointer'}}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Crate return */}
              {d.cratesOut > 0 && s.crateOpen && (
                <div className="slide-up" style={{borderTop:'1px solid #FEF3C7',background:'#FFFBF0',padding:'14px 18px',display:'flex',alignItems:'center',gap:8}}>
                  <Package size={14} style={{color:'#D97706',flexShrink:0}}/>
                  <input type="number" inputMode="numeric" min="1" max={d.cratesOut} placeholder={`Max ${d.cratesOut}`} value={s.crateQty} onChange={e=>setS(key,{crateQty:e.target.value})} style={{flex:1,background:'#fff',border:'1.5px solid #FDE68A',borderRadius:10,padding:'9px 12px',fontSize:16,color:'#111827',outline:'none'}}/>
                  <button onClick={()=>submitReturn(d)} disabled={s.saving} style={{background:'linear-gradient(135deg,#D97706,#B45309)',color:'#fff',border:'none',borderRadius:10,padding:'9px 14px',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',opacity:s.saving?.6:1}}>
                    {s.saving?<Loader2 size={12} className="animate-spin"/>:<PackageCheck size={12}/>} Log Return
                  </button>
                  <button onClick={()=>setS(key,{crateOpen:false})} style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:4,fontSize:14}}>✕</button>
                </div>
              )}
            </div>
          )
        })}

        <CustomerDirectory customers={allCust} onOpen={openSheet}/>
      </div>
      {sheetCustomer && <CustomerSheet customer={sheetCustomer} onClose={()=>setSheetCustomer(null)}/>}
    </>
  )
}

function CustomerDirectory({ customers, onOpen }) {
  const list = Object.values(customers).sort((a,b) => a.name.localeCompare(b.name))
  if (!list.length) return null
  return (
    <div style={{background:'#FFFFFF',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.07)',border:'1.5px solid #F3F4F6',overflow:'hidden',marginTop:4}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <p className="label" style={{marginBottom:0}}>All Customers ({list.length})</p>
      </div>
      {list.map((c,idx) => (
        <button key={c.name} onClick={()=>onOpen(c.name)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',background:'none',border:'none',cursor:'pointer',borderBottom:idx<list.length-1?'1px solid #F3F4F6':'none',textAlign:'left'}}>
          <div>
            <p style={{fontSize:13,fontWeight:600,color:'#111827'}}>{c.name}</p>
            <p style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{c.sales.length} sale{c.sales.length!==1?'s':''}</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {c.owed > 0 && <span className="num" style={{fontSize:12,fontWeight:700,color:'#DC2626'}}>{fmtNaira(c.owed)}</span>}
            <ExternalLink size={13} style={{color:'#9CA3AF'}}/>
          </div>
        </button>
      ))}
    </div>
  )
}
