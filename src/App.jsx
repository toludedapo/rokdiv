import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LayoutDashboard, PlusCircle, Clock, History, LogOut, Download, Loader2, WifiOff, RefreshCw } from 'lucide-react'
import { useAuth } from './hooks/useAuth.jsx'
import { useSales, useCollections, useCrateInventory } from './hooks/useCloudData.js'
import { usePayments } from './hooks/usePayments.js'
import { useOfflineSync } from './hooks/useOfflineSync.js'
import { useWeeklySummary } from './hooks/useWeeklySummary.js'
import { todayLabel } from './utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from './utils/exportUtils.js'
import AuthScreen from './components/AuthScreen.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import CollectionForm from './components/CollectionForm.jsx'
import SalesForm from './components/SalesForm.jsx'
import CreditTracker, { computeDebtors } from './components/CreditTracker.jsx'
import CrateInventoryCard from './components/CrateInventoryCard.jsx'
import HistoryLog from './components/HistoryLog.jsx'
import Toast from './components/Toast.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'log',       label: 'Log Entry',  Icon: PlusCircle       },
  { id: 'credit',    label: 'Credit',     Icon: Clock            },
  { id: 'history',   label: 'History',    Icon: History          },
]

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()

  if (authLoading) return (
    <div style={{ minHeight:'100vh', background:'#F0F2F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Loader2 size={28} className="animate-spin" style={{ color:'#4F6EF7' }} />
    </div>
  )
  if (!user) return <AuthScreen />
  return <Dashboard user={user} onSignOut={signOut} />
}

function Dashboard({ user, onSignOut }) {
  const [tab,      setTab]      = useState('dashboard')
  const [toast,    setToast]    = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const showToast = useCallback(msg => setToast(msg), [])

  const { sales,       loading: salesLoading, addSale,       updateSale,       deleteSale,       markPaid      } = useSales(user.id)
  const { collections, loading: collLoading,  addCollection, deleteCollection                                  } = useCollections(user.id)
  const { inventory,   loading: invLoading,   setTotalOwned                                                    } = useCrateInventory(user.id)
  const { payments,                           addPayment                                                       } = usePayments(user.id)

  const { offlineSales, offlineCollections, isSyncing, queueSale, queueCollection } = useOfflineSync({ addSale, addCollection, showToast })

  const cloudSaleIds = useMemo(() => new Set(sales.map(s => s.id)), [sales])
  const cloudCollIds = useMemo(() => new Set(collections.map(c => c.id)), [collections])

  const allSales       = useMemo(() => [...sales, ...offlineSales.filter(s => !cloudSaleIds.has(s.id))], [sales, offlineSales, cloudSaleIds])
  const allCollections = useMemo(() => [...collections, ...offlineCollections.filter(c => !cloudCollIds.has(c.id))], [collections, offlineCollections, cloudCollIds])

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useWeeklySummary(allSales, allCollections)

  const cratesOut    = useMemo(() => allSales.reduce((sum,s) => sum+((s.crates_loaned||0)-(s.crates_returned||0)),0), [allSales])
  const cratesInFarm = Math.max(0, (inventory?.total_owned ?? 0) - cratesOut)
  const paymentsTotal = useMemo(() => payments.reduce((s,p) => s+Number(p.amount),0), [payments])

  const handleReturnCrates = useCallback(async (saleId, newReturned) => {
    await updateSale(saleId, { crates_returned: newReturned })
  }, [updateSale])

  async function clearAll() {
    for (const s of sales)       await deleteSale(s.id)
    for (const c of collections) await deleteCollection(c.id)
    showToast('All records cleared')
  }

  const debtorCount  = useMemo(() => computeDebtors(allSales, payments).length, [allSales, payments])
  const offlineCount = offlineSales.length + offlineCollections.length

  const [deferredInstall, setDeferredInstall] = useState(null)
  const [showInstall,     setShowInstall]     = useState(false)
  useEffect(() => {
    const h = e => { e.preventDefault(); setDeferredInstall(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#F0F2F5', maxWidth:480, margin:'0 auto' }}>

      {/* ── Header ── */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #F3F4F6',
        padding: `max(14px, env(safe-area-inset-top)) 16px 14px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#4F6EF7,#3B55E0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 2px 8px rgba(79,110,247,0.3)' }}>
            🥚
          </div>
          <div>
            <h1 style={{ fontSize:15, fontWeight:700, color:'#111827', letterSpacing:'-0.01em', lineHeight:1 }}>ROKDIV</h1>
            <p style={{ fontSize:10, color:'#9CA3AF', lineHeight:1, marginTop:2 }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {!isOnline && (
            <div style={{ display:'flex', alignItems:'center', gap:4, background:'#EEF1FF', border:'1px solid #C7D2FE', borderRadius:99, padding:'4px 10px' }}>
              <WifiOff size={11} style={{ color:'#4F6EF7' }} />
              <span style={{ fontSize:10, fontWeight:700, color:'#4F6EF7' }}>Offline</span>
            </div>
          )}
          {isSyncing && (
            <div style={{ display:'flex', alignItems:'center', gap:4, background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:99, padding:'4px 10px' }}>
              <RefreshCw size={10} style={{ color:'#059669' }} className="sync-spin" />
              <span style={{ fontSize:10, fontWeight:700, color:'#059669' }}>Syncing</span>
            </div>
          )}
          {offlineCount > 0 && !isSyncing && (
            <div style={{ display:'flex', alignItems:'center', gap:4, background:'#EEF1FF', border:'1px solid #C7D2FE', borderRadius:99, padding:'4px 10px' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#4F6EF7' }}>💾 {offlineCount}</span>
            </div>
          )}
          {showInstall && (
            <button onClick={() => { deferredInstall?.prompt(); setShowInstall(false) }} style={{ fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:99, background:'#EEF1FF', border:'1px solid #C7D2FE', color:'#4F6EF7', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <Download size={10} /> Install
            </button>
          )}
          <span style={{ fontSize:10, fontFamily:'JetBrains Mono, monospace', color:'#9CA3AF', background:'#F3F4F6', borderRadius:99, padding:'4px 10px', display:'none' }} className="sm:inline">
            {todayLabel()}
          </span>
          <button onClick={onSignOut} title="Sign out" style={{ width:32, height:32, borderRadius:8, background:'#F3F4F6', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280', cursor:'pointer' }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex:1, overflowY:'auto', paddingBottom:96 }}>

        {tab === 'dashboard' && (
          <div style={{ paddingTop:10, display:'flex', flexDirection:'column', gap:12 }}>
            <SummaryCards sales={allSales} collections={allCollections} paymentsTotal={paymentsTotal} />
            <CrateInventoryCard inventory={inventory} cratesOut={cratesOut} loading={invLoading} onSetTotalOwned={setTotalOwned} />
            <div style={{ margin:'0 16px', background:'#FFFFFF', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:'1.5px solid #F3F4F6', padding:'16px 18px' }}>
              <p className="label" style={{ marginBottom:10 }}>Quick Export</p>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { label:'Sales',       fn:()=>{ exportSalesCSV(allSales);            showToast('Sales CSV downloaded')       } },
                  { label:'Collections', fn:()=>{ exportCollectionsCSV(allCollections); showToast('Collections CSV downloaded') } },
                ].map(({label,fn}) => (
                  <button key={label} onClick={fn} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'#F8F9FB', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'10px 0', fontSize:12, fontWeight:600, color:'#6B7280', cursor:'pointer' }}>
                    <Download size={12}/> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div style={{ paddingTop:12, display:'flex', flexDirection:'column', gap:12 }}>
            <CollectionForm collections={allCollections} onSave={addCollection} onDelete={deleteCollection} onQueueOffline={queueCollection} showToast={showToast} />
            <SalesForm sales={allSales} cratesInFarm={cratesInFarm} onSave={addSale} onDelete={deleteSale} onMarkPaid={markPaid} onQueueOffline={queueSale} showToast={showToast} />
          </div>
        )}

        {tab === 'credit' && (
          <div style={{ paddingTop:12 }}>
            <CreditTracker sales={allSales} payments={payments} onMarkPaid={markPaid} onReturnCrates={handleReturnCrates} onAddPayment={addPayment} showToast={showToast} />
          </div>
        )}

        {tab === 'history' && (
          <div style={{ paddingTop:12 }}>
            <HistoryLog sales={allSales} collections={allCollections} onClearAll={clearAll} showToast={showToast} />
          </div>
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:480, margin:'0 auto', background:'#FFFFFF', borderTop:'1px solid #F3F4F6', display:'flex', zIndex:40, paddingBottom:'env(safe-area-inset-bottom, 0px)', boxShadow:'0 -1px 8px rgba(0,0,0,0.06)' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active   = tab === id
          const hasAlert = id === 'credit' && debtorCount > 0
          return (
            <button key={id} onClick={() => setTab(id)} aria-label={label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 0 8px', gap:3, background:'none', border:'none', cursor:'pointer', position:'relative', color:active?'#4F6EF7':'#9CA3AF', transition:'color 0.15s' }}>
              <div style={{ position:'relative' }}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                {hasAlert && (
                  <span className="notif-pop" style={{ position:'absolute', top:-4, right:-6, background:'#DC2626', color:'#fff', fontSize:8, fontFamily:'JetBrains Mono, monospace', fontWeight:700, width:15, height:15, borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {debtorCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize:10, fontWeight:700 }}>{label}</span>
              {active && <div style={{ position:'absolute', bottom:0, left:'20%', right:'20%', height:2, background:'linear-gradient(90deg,#4F6EF7,#6C8EFF)', borderRadius:99 }} />}
            </button>
          )
        })}
      </nav>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
