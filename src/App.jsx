import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { useAuth }          from './hooks/useAuth'
import { useSales, useCollections, useCrateInventory } from './hooks/useCloudData'
import { usePayments }      from './hooks/usePayments'
import { useExpenses }      from './hooks/useExpenses'
import { useOfflineSync }   from './hooks/useOfflineSync'
import { useWeeklySummary } from './hooks/useWeeklySummary'

import AuthScreen         from './components/AuthScreen'
import SummaryCards       from './components/SummaryCards'
import CollectionForm     from './components/CollectionForm'
import SalesForm          from './components/SalesForm'
import CreditTracker      from './components/CreditTracker'
import HistoryLog         from './components/HistoryLog'
import ExpenseTracker     from './components/ExpenseTracker'
import UserManager        from './components/UserManager'
import Toast              from './components/Toast'
import ChangePassword     from './components/ChangePassword'
import CrateInventoryCard from './components/CrateInventoryCard'

const ADMIN_EMAIL = 'dadimula1@gmail.com'

const NAV_TABS = [
  { id: 'dashboard', icon: '⌂',  label: 'Home'     },
  { id: 'collect',   icon: '🥚', label: 'Collect'  },
  { id: 'sales',     icon: '🛒', label: 'Sales'    },
  { id: 'credit',    icon: '📋', label: 'Credit'   },
  { id: 'expenses',  icon: '💸', label: 'Expenses' },
  { id: 'history',   icon: '📜', label: 'History'  },
]

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { collections, addCollection }                    = useCollections(user?.id)
  const { sales, addSale, updateSale, markPaid }          = useSales(user?.id)
  const { inventory, setTotalOwned }                      = useCrateInventory(user?.id)
  const { payments, addPayment, deletePayment }           = usePayments(user?.id)
  const { expenses, addExpense, deleteExpense }           = useExpenses(user?.id)

  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [toast,        setToast]        = useState(null)
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [offlineCount, setOfflineCount] = useState(0)
  const [showChangePw, setShowChangePw] = useState(false)

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const allTabs = isAdmin
    ? [...NAV_TABS, { id: 'users', icon: '👥', label: 'Users' }]
    : NAV_TABS

  // ── showToast must be defined before useOfflineSync ────────────────
  function showToast(msg) {
    setToast({ message: msg })
    setTimeout(() => setToast(null), 3000)
  }

  // FIX 1: useOfflineSync needs showToast; FIX 2: don't pass unused 'user'
  useOfflineSync({ addCollection, addSale, showToast })

  // FIX 3: useWeeklySummary takes positional args, not an object
  useWeeklySummary(sales, collections)

  // Quick-action nav from dashboard buttons
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail)
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

  // ── Handlers ────────────────────────────────────────────────────────
  // FIX 4: CollectionForm/SalesForm use try/catch and expect onSave to throw.
  // addCollection/addSale return {error}. We throw so the form's catch block
  // can queue offline — but only on actual network errors, not validation.
  async function handleAddCollection(data) {
    const { error } = await addCollection(data)
    if (error) throw new Error(error.message || 'Failed to save')
  }

  async function handleAddSale(data) {
    const { error } = await addSale(data)
    if (error) throw new Error(error.message || 'Failed to save')
  }

  // FIX 5: use markPaid from hook (sets both payment_status AND paid_at)
  async function handleMarkPaid(saleId) {
    await markPaid(saleId)
    showToast('Marked as paid ✓')
  }

  async function handleReturnCrates(saleId, newReturnedCount) {
    const { error } = await updateSale(saleId, { crates_returned: newReturnedCount })
    if (error) showToast('Could not update crate return')
    else showToast('Crate return recorded ✓')
  }

  // FIX 6: addPayment throws on error — wrap in try/catch
  async function handleAddPayment(data) {
    try {
      await addPayment({ ...data, user_id: user.id })
      showToast('Payment recorded ✓')
    } catch (e) {
      showToast('Could not save payment')
    }
  }

  async function handleAddExpense(data) {
    const { error } = await addExpense(data)
    if (!error) showToast('Expense logged ✓')
    return { error }
  }

  async function handleDeleteExpense(id) {
    if (!isAdmin) return
    await deleteExpense(id)
    showToast('Expense removed')
  }

  // FIX 7: deletePayment throws — wrap in try/catch
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

  // ── Render guards ───────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F0F2F5' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🥚</div>
        <p style={{ color:'#9CA3AF', fontSize:'14px' }}>Loading…</p>
      </div>
    </div>
  )

  if (!user) return <AuthScreen />

  const cratesOut = (sales || []).reduce(
    (s, sale) => s + (parseInt(sale.crates_loaned || 0) - parseInt(sale.crates_returned || 0)), 0
  )

  return (
    <div style={{ background:'#F0F2F5', minHeight:'100vh', maxWidth:'480px', margin:'0 auto', fontFamily:"'Inter', -apple-system, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background:'white', padding:'14px 16px 10px',
        borderBottom:'1px solid #F3F4F6',
        position:'sticky', top:0, zIndex:50,
        boxShadow:'0 1px 6px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'22px' }}>🥚</span>
            <div>
              <h1 style={{ margin:0, fontSize:'17px', fontWeight:800, color:'#111827', letterSpacing:'-0.02em' }}>ROKDIV</h1>
              <p style={{ margin:0, fontSize:'11px', color:'#9CA3AF' }}>Farm Tracker</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{
              background: isAdmin ? '#EEF1FF' : '#F0FDF4',
              color:      isAdmin ? '#4F6EF7' : '#16A34A',
              fontSize:'10px', fontWeight:700, padding:'3px 8px',
              borderRadius:'20px', letterSpacing:'0.04em',
              border:`1px solid ${isAdmin ? '#C7D2FE' : '#BBF7D0'}`
            }}>
              {isAdmin ? 'ADMIN' : 'STAFF'}
            </span>

            {!isAdmin && (
              <button onClick={() => setShowChangePw(true)}
                style={{ background:'#F3F4F6', border:'none', borderRadius:'8px',
                  padding:'7px 10px', cursor:'pointer', color:'#6B7280',
                  display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', fontWeight:600 }}>
                🔑 Set Password
              </button>
            )}

            {!isOnline && (
              <span style={{
                background:'#FEF3C7', color:'#92400E', fontSize:'11px',
                fontWeight:600, padding:'3px 8px', borderRadius:'20px',
                border:'1px solid #FDE68A'
              }}>
                Offline{offlineCount > 0 ? ` · ${offlineCount} queued` : ''}
              </span>
            )}

            <button onClick={signOut} style={{
              background:'#FEE2E2', border:'none', borderRadius:'8px',
              padding:'7px 12px', cursor:'pointer', fontSize:'12px',
              fontWeight:600, color:'#DC2626', display:'flex', alignItems:'center', gap:'4px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'16px 14px', paddingBottom:'90px' }}>

        {activeTab === 'dashboard' && (
          <>
            <SummaryCards collections={collections} sales={sales} expenses={expenses} payments={payments} />
            <div style={{ marginTop:'12px' }}>
              <CrateInventoryCard
                inventory={inventory}
                cratesOut={cratesOut}
                loading={false}
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
            cratesInFarm={inventory?.total_owned ?? 0}
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

        {activeTab === 'history' && (
          <HistoryLog
            collections={collections}
            sales={sales}
            onClearAll={handleClearAll}
            showToast={showToast}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManager adminEmail={ADMIN_EMAIL} />
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:'480px', background:'white',
        borderTop:'1px solid #F3F4F6', display:'flex',
        boxShadow:'0 -2px 12px rgba(0,0,0,0.08)', zIndex:50
      }}>
        {allTabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex:1, padding:'10px 4px 8px', background:'none', border:'none',
                cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', gap:'3px', position:'relative'
              }}>
              <span style={{ fontSize: allTabs.length > 6 ? '16px' : '18px', lineHeight:1 }}>{tab.icon}</span>
              <span style={{
                fontSize:'9px', fontWeight: active ? 700 : 500,
                color: active ? '#4F6EF7' : '#9CA3AF', letterSpacing:'0.02em'
              }}>{tab.label}</span>
              {active && (
                <div style={{
                  position:'absolute', bottom:0, width:'20px', height:'2.5px',
                  background:'#4F6EF7', borderRadius:'2px 2px 0 0'
                }} />
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