import { useState, useEffect } from 'react'
import { Home, Egg, ShoppingCart, Users as UsersIcon, FileText, Receipt, History as HistoryIcon, Settings, Key, LogOut } from 'lucide-react'
import { supabase } from './lib/supabase.js'
import { useAuth }          from './hooks/useAuth'
import { useSales, useCollections, useCrateInventory } from './hooks/useCloudData'
import { useCustomers }    from './hooks/useCustomers'
import { usePayments }      from './hooks/usePayments'
import { useExpenses }      from './hooks/useExpenses'
import { useOfflineSync }   from './hooks/useOfflineSync'
import { useWeeklySummary } from './hooks/useWeeklySummary'

import AuthScreen         from './components/AuthScreen'
import SummaryCards, { CollectionChart } from './components/SummaryCards'
import CollectionForm     from './components/CollectionForm'
import SalesForm          from './components/SalesForm'
import CreditTracker      from './components/CreditTracker'
import HistoryLog         from './components/HistoryLog'
import ExpenseTracker     from './components/ExpenseTracker'
import UserManager        from './components/UserManager'
import CustomerManager    from './components/CustomerManager'
import Toast              from './components/Toast'
import ChangePassword     from './components/ChangePassword'
import CrateInventoryCard from './components/CrateInventoryCard'

const ADMIN_EMAIL = 'dadimula1@gmail.com'

// Sentence case labels, quiet line icons instead of emoji
const NAV_TABS = [
  { id: 'dashboard',  Icon: Home,         label: 'Home'      },
  { id: 'collect',    Icon: Egg,          label: 'Collect'   },
  { id: 'sales',      Icon: ShoppingCart, label: 'Sales'     },
  { id: 'customers',  Icon: UsersIcon,    label: 'Customers' },
  { id: 'credit',     Icon: FileText,     label: 'Credit'    },
  { id: 'expenses',   Icon: Receipt,      label: 'Expenses'  },
  { id: 'history',    Icon: HistoryIcon,  label: 'History'   },
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { collections, addCollection, loading: collectionsLoading } = useCollections(user?.id)
  const { sales, addSale, updateSale, markPaid, loading: salesLoading } = useSales(user?.id)
  const { inventory, setTotalOwned }                      = useCrateInventory(user?.id)
  const { payments, addPayment, deletePayment }           = usePayments(user?.id)
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers(user?.id)
  const { expenses, addExpense, deleteExpense }           = useExpenses(user?.id)

  const [activeTab,    setActiveTab]    = useState(() => localStorage.getItem('rokdiv_tab') || 'dashboard')
  const [toast,        setToast]        = useState(null)
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [offlineCount, setOfflineCount] = useState(0)
  const [showChangePw, setShowChangePw] = useState(false)
  const isDesktop = useIsDesktop()

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const dataLoading = !!(collectionsLoading || salesLoading)
  const allTabs = isAdmin
    ? [...NAV_TABS, { id: 'users', Icon: Settings, label: 'Users' }]
    : NAV_TABS

  function handleTabChange(tab) {
    setActiveTab(tab)
    localStorage.setItem('rokdiv_tab', tab)
  }

  function showToast(msg) {
    setToast({ message: msg })
    setTimeout(() => setToast(null), 3000)
  }

  useOfflineSync({ addCollection, addSale, showToast })
  useWeeklySummary(sales, collections)

  useEffect(() => {
    const handler = (e) => handleTabChange(e.detail)
    window.addEventListener('rokdiv-nav', handler)
    return () => window.removeEventListener('rokdiv-nav', handler)
  }, [])

  useEffect(() => {
    const go   = () => setIsOnline(true)
    const gone = () => setIsOnline(false)
    window.addEventListener('online',  go)
    window.addEventListener('offline', gone)
    return () => {
      window.removeEventListener('online',  go)
      window.removeEventListener('offline', gone)
    }
  }, [])

  useEffect(() => {
    const q1 = JSON.parse(localStorage.getItem('offline_collections') || '[]')
    const q2 = JSON.parse(localStorage.getItem('offline_sales')       || '[]')
    setOfflineCount(q1.length + q2.length)
  }, [collections, sales])

  async function handleAddCollection(data) {
    const { error } = await addCollection(data)
    if (error) throw new Error(error.message || 'Failed to save')
  }

  async function handleAddSale(data) {
    const { error } = await addSale(data)
    if (error) throw new Error(error.message || 'Failed to save')
  }

  async function handleMarkPaid(saleId) {
    await markPaid(saleId)
    showToast('Marked as paid')
  }

  async function handleReturnCrates(saleId, newReturnedCount) {
    const { error } = await updateSale(saleId, { crates_returned: newReturnedCount })
    if (error) showToast('Could not update crate return')
    else showToast('Crate return recorded')
  }

  async function handleAddPayment(data) {
    try {
      await addPayment({ ...data, user_id: user.id })
      showToast('Payment recorded')
    } catch (e) {
      showToast('Could not save payment')
    }
  }

  async function handleAddExpense(data) {
    const { error } = await addExpense(data)
    if (!error) showToast('Expense logged')
    return { error }
  }

  async function handleDeleteExpense(id) {
    if (!isAdmin) return
    await deleteExpense(id)
    showToast('Expense removed')
  }

  async function handleDeletePayment(id) {
    if (!isAdmin) return
    try {
      await deletePayment(id)
      showToast('Payment record removed')
    } catch (e) {
      showToast('Could not remove payment')
    }
  }

  async function handleClearAll() {
    const { error } = await supabase.rpc('clear_user_data')
    if (error) {
      showToast('Could not clear data: ' + error.message)
      return
    }
    showToast('All data cleared')
    setTimeout(() => signOut(), 1000)
  }

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0D0D0D' }}>
      <p style={{ color:'#8E8E93', fontSize:'14px' }}>Loading…</p>
    </div>
  )

  if (!user) return <AuthScreen />

  const cratesOut = (sales || []).reduce(
    (s, sale) => s + (parseInt(sale.crates_loaned || 0) - parseInt(sale.crates_returned || 0)), 0
  )

  const metaName = user?.user_metadata?.full_name
  const greetName = metaName ? metaName.split(' ')[0] : null
  const initials = metaName
    ? metaName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (isAdmin ? 'A' : 'S')

  const tabContent = (
    <>
      {activeTab === 'dashboard' && (
        <>
          <SummaryCards collections={collections} sales={sales} expenses={expenses} payments={payments} />
          <div style={{ marginTop:'12px' }}>
            <CrateInventoryCard
              inventory={inventory}
              cratesOut={cratesOut}
              loading={dataLoading}
              onSetTotalOwned={setTotalOwned}
            />
          </div>
        </>
      )}
      {activeTab === 'collect' && (
        <CollectionForm
          collections={collections || []}
          onSave={handleAddCollection}
          onDelete={() => {}}
          onQueueOffline={() => {}}
          showToast={showToast}
        />
      )}
      {activeTab === 'sales' && (
        <SalesForm
          sales={sales || []}
          customers={customers}
          cratesInFarm={Math.max(0, (inventory?.total_owned ?? 0) - cratesOut)}
          onSave={handleAddSale}
          onDelete={() => {}}
          onMarkPaid={handleMarkPaid}
          onReturnCrates={handleReturnCrates}
          onQueueOffline={() => {}}
          showToast={showToast}
        />
      )}
      {activeTab === 'credit' && (
        <CreditTracker
          sales={sales}
          onMarkPaid={handleMarkPaid}
          payments={payments}
          onAddPayment={handleAddPayment}
          onDeletePayment={handleDeletePayment}
          onReturnCrates={handleReturnCrates}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'expenses' && (
        <ExpenseTracker
          expenses={expenses}
          onAdd={handleAddExpense}
          onDelete={handleDeleteExpense}
          monthlySales={sales}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'customers' && (
        <CustomerManager
          customers={customers}
          onAdd={addCustomer}
          onUpdate={updateCustomer}
          onDelete={isAdmin ? deleteCustomer : null}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'history' && (
        <HistoryLog
          collections={collections}
          sales={sales}
          payments={payments}
          onClearAll={handleClearAll}
          showToast={showToast}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'users' && isAdmin && (
        <UserManager adminEmail={ADMIN_EMAIL} />
      )}
    </>
  )

  // ── Header (shared, new system) ──────────────────────────────────────
  const header = isDesktop ? (
    <div style={{ background:'#FFFFFF', borderBottom:'1px solid #E5E5EA', position:'sticky', top:0, zIndex:50 }}>
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'14px 32px', borderBottom:'0.5px solid #E5E5EA',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          {activeTab === 'dashboard' ? (
            <>
              <p style={{ margin:0, fontSize:'12px', color:'#8E8E93' }}>{getGreeting()}</p>
              <h1 style={{ margin:0, fontSize:'19px', fontWeight:500, color:'#1C1C1E', letterSpacing:'-0.02em' }}>{greetName ? `${greetName} · ROKDIV` : 'ROKDIV'}</h1>
            </>
          ) : (
            <h1 style={{ margin:0, fontSize:'17px', fontWeight:500, color:'#1C1C1E', letterSpacing:'-0.02em' }}>ROKDIV</h1>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {!isOnline && (
            <span style={{ background:'rgba(255,159,10,0.16)', color:'#FF9F0A', fontSize:'11px', fontWeight:500, padding:'4px 9px', borderRadius:'99px' }}>
              Offline{offlineCount > 0 ? ` · ${offlineCount} queued` : ''}
            </span>
          )}
          <span style={{
            fontSize:'11px', fontWeight:500, padding:'4px 9px', borderRadius:'99px',
            color: isAdmin ? '#0A84FF' : '#34C759',
            background: isAdmin ? 'rgba(10,132,255,0.12)' : 'rgba(52,199,89,0.12)'
          }}>
            {isAdmin ? 'Admin' : 'Staff'}
          </span>
          {!isAdmin && (
            <button onClick={() => setShowChangePw(true)} style={iconBtn}>
              <Key size={14} />
            </button>
          )}
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#1C1C1E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, color:'#FFFFFF' }}>
            {initials}
          </div>
          <button onClick={signOut} style={{ ...iconBtn, color:'#FF453A' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 32px' }}>
        <nav style={{ display:'flex', gap:'4px' }}>
          {allTabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
              padding:'10px 14px', border:'none', background:'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #1C1C1E' : '2px solid transparent',
              color: activeTab === tab.id ? '#1C1C1E' : '#8E8E93',
              fontWeight: 500, fontSize:'13px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap', marginBottom:'-1px'
            }}>
              <tab.Icon size={15} /> {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  ) : (
    <div style={{
      background:'#FFFFFF', padding:'14px 16px', borderBottom:'0.5px solid #E5E5EA',
      position:'sticky', top:0, zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'space-between'
    }}>
      <div>
        {activeTab === 'dashboard' ? (
          <>
            <p style={{ margin:0, fontSize:'11px', color:'#8E8E93' }}>{getGreeting()}</p>
            <h1 style={{ margin:0, fontSize:'16px', fontWeight:500, color:'#1C1C1E', letterSpacing:'-0.02em' }}>{greetName} · ROKDIV</h1>
          </>
        ) : (
          <h1 style={{ margin:0, fontSize:'16px', fontWeight:500, color:'#1C1C1E', letterSpacing:'-0.02em' }}>ROKDIV</h1>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        {!isOnline && (
          <span style={{ background:'rgba(255,159,10,0.16)', color:'#FF9F0A', fontSize:'10px', fontWeight:500, padding:'3px 8px', borderRadius:'99px' }}>
            Offline{offlineCount > 0 ? ` · ${offlineCount}` : ''}
          </span>
        )}
        <span style={{
          fontSize:'10px', fontWeight:500, padding:'3px 8px', borderRadius:'99px',
          color: isAdmin ? '#0A84FF' : '#34C759',
          background: isAdmin ? 'rgba(10,132,255,0.12)' : 'rgba(52,199,89,0.12)'
        }}>
          {isAdmin ? 'Admin' : 'Staff'}
        </span>
        {!isAdmin && (
          <button onClick={() => setShowChangePw(true)} style={iconBtn}>
            <Key size={13} />
          </button>
        )}
        <div style={{ width:28, height:28, borderRadius:'50%', background:'#1C1C1E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:'#FFFFFF' }}>
          {initials}
        </div>
        <button onClick={signOut} style={{ ...iconBtn, color:'#FF453A' }}>
          <LogOut size={13} />
        </button>
      </div>
    </div>
  )

  // ── DESKTOP layout ──────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ background:'#F2F2F7', minHeight:'100vh', fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
        {header}
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'24px 32px' }}>
          {activeTab === 'dashboard' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'24px', alignItems:'start' }}>
              <div style={{ gridColumn:'1 / 3' }}>
                <SummaryCards collections={collections} sales={sales} expenses={expenses} payments={payments} isDesktop={true} />
              </div>
              <div>
                <CrateInventoryCard
                  inventory={inventory}
                  cratesOut={cratesOut}
                  loading={dataLoading}
                  onSetTotalOwned={setTotalOwned}
                />
                {collections.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <CollectionChart collections={collections} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            tabContent
          )}
        </div>
        {showChangePw && <ChangePassword onClose={() => setShowChangePw(false)} />}
        {toast && <Toast message={toast.message} onDone={() => setToast(null)} />}
      </div>
    )
  }

  // ── MOBILE layout ───────────────────────────────────────────────────
  return (
    <div style={{ background:'#F2F2F7', minHeight:'100vh', maxWidth:'480px', margin:'0 auto', fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
      {header}
      <div style={{ padding:'16px 14px', paddingBottom:'90px' }}>
        {tabContent}
      </div>
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:'480px', background:'#FFFFFF',
        borderTop:'0.5px solid #E5E5EA', display:'flex', zIndex:50
      }}>
        {allTabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              style={{
                flex:1, padding:'10px 4px 8px', background:'none', border:'none',
                cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', gap:'3px', position:'relative'
              }}>
              <tab.Icon size={allTabs.length > 6 ? 16 : 18} color={active ? '#1C1C1E' : '#8E8E93'} />
              <span style={{
                fontSize:'9px', fontWeight: active ? 500 : 400,
                color: active ? '#1C1C1E' : '#8E8E93'
              }}>{tab.label}</span>
              {active && (
                <div style={{ position:'absolute', bottom:0, width:'20px', height:'2px', background:'#1C1C1E', borderRadius:'2px 2px 0 0' }} />
              )}
            </button>
          )
        })}
      </nav>
      {showChangePw && <ChangePassword onClose={() => setShowChangePw(false)} />}
      {toast && <Toast message={toast.message} onDone={() => setToast(null)} />}
    </div>
  )
}

const iconBtn = {
  width:30, height:30, borderRadius:8, background:'#F2F2F7', border:'none',
  display:'flex', alignItems:'center', justifyContent:'center', color:'#8E8E93', cursor:'pointer',
}