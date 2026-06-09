import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LayoutDashboard, PlusCircle, Clock, History, LogOut, Download, Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth.jsx'
import { useSales, useCollections, useCrateInventory } from './hooks/useCloudData.js'
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

  // Show auth screen while loading or when signed out
  if (authLoading) return (
    <div className="min-h-screen bg-farm-ivory flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-farm-green" />
    </div>
  )
  if (!user) return <AuthScreen />

  return <Dashboard user={user} onSignOut={signOut} />
}

function Dashboard({ user, onSignOut }) {
  const [tab,   setTab]   = useState('dashboard')
  const [toast, setToast] = useState('')

  const showToast = useCallback(msg => setToast(msg), [])

  // Cloud data hooks — all keyed to user.id
  const { sales, loading: salesLoading, addSale, updateSale, deleteSale, markPaid } = useSales(user.id)
  const { collections, loading: collLoading, addCollection, deleteCollection }       = useCollections(user.id)
  const { inventory, loading: invLoading, setTotalOwned }                            = useCrateInventory(user.id)

  // Derived: total crates out with buyers
  const cratesOut = useMemo(() => {
    return sales.reduce((sum, s) => sum + ((s.crates_loaned||0) - (s.crates_returned||0)), 0)
  }, [sales])

  const cratesInFarm = Math.max(0, (inventory?.total_owned ?? 0) - cratesOut)

  // Crate return handler: update crates_returned on a specific sale
  const handleReturnCrates = useCallback(async (saleId, newReturned) => {
    await updateSale(saleId, { crates_returned: newReturned })
  }, [updateSale])

  // Clear all (history page)
  async function clearAll() {
    for (const s of sales) await deleteSale(s.id)
    for (const c of collections) await deleteCollection(c.id)
    showToast('All records cleared')
  }

  const debtorCount = useMemo(() => computeDebtors(sales).length, [sales])

  // PWA install banner
  const [deferredInstall, setDeferredInstall] = useState(null)
  const [showInstall,     setShowInstall]     = useState(false)
  useEffect(() => {
    const h = e => { e.preventDefault(); setDeferredInstall(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  function handleInstall() {
    if (!deferredInstall) return
    deferredInstall.prompt()
    deferredInstall.userChoice.then(() => { setShowInstall(false); setDeferredInstall(null) })
  }

  return (
    <div className="flex flex-col min-h-screen bg-farm-ivory max-w-lg mx-auto">

      {/* ── Top bar ── */}
      <header className="bg-farm-green text-white px-4 sticky top-0 z-40 flex items-center justify-between"
        style={{ paddingTop:'max(12px, env(safe-area-inset-top))', paddingBottom:'12px' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label="egg">🥚</span>
          <div>
            <h1 className="text-base font-semibold tracking-wide leading-tight">ROKDIV</h1>
            <p className="text-[10px] text-green-200 leading-tight">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showInstall && (
            <button onClick={handleInstall}
              className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-3 py-1.5 font-medium">
              <Download size={11} /> Install
            </button>
          )}
          <span className="text-xs bg-white/15 rounded-full px-2.5 py-1 font-mono hidden sm:inline">{todayLabel()}</span>
          <button onClick={onSignOut} title="Sign out"
            className="bg-white/15 hover:bg-white/25 rounded-full p-1.5 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto pb-24">

        {tab === 'dashboard' && (
          <div className="pt-2 space-y-3">
            <SummaryCards sales={sales} collections={collections} />
            <CrateInventoryCard
              inventory={inventory}
              cratesOut={cratesOut}
              loading={invLoading}
              onSetTotalOwned={setTotalOwned}
            />
            <div className="mx-4 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2.5">Quick Export</p>
              <div className="flex gap-2">
                <button onClick={() => { exportSalesCSV(sales); showToast('Sales CSV downloaded') }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-xs text-gray-600 font-medium bg-gray-50 active:scale-[0.98]">
                  <Download size={12} /> Sales
                </button>
                <button onClick={() => { exportCollectionsCSV(collections); showToast('Collections CSV downloaded') }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-xs text-gray-600 font-medium bg-gray-50 active:scale-[0.98]">
                  <Download size={12} /> Collections
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div className="pt-4 space-y-3">
            <CollectionForm
              collections={collections}
              onSave={addCollection}
              onDelete={deleteCollection}
              showToast={showToast}
            />
            <SalesForm
              sales={sales}
              cratesInFarm={cratesInFarm}
              onSave={addSale}
              onDelete={deleteSale}
              onMarkPaid={markPaid}
              showToast={showToast}
            />
          </div>
        )}

        {tab === 'credit' && (
          <div className="pt-4">
            <CreditTracker
              sales={sales}
              onMarkPaid={markPaid}
              onReturnCrates={handleReturnCrates}
              showToast={showToast}
            />
          </div>
        )}

        {tab === 'history' && (
          <div className="pt-4">
            <HistoryLog
              sales={sales}
              collections={collections}
              onClearAll={clearAll}
              showToast={showToast}
            />
          </div>
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex z-40"
        style={{ paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active   = tab === id
          const hasAlert = id === 'credit' && debtorCount > 0
          return (
            <button key={id} onClick={() => setTab(id)} aria-label={label}
              className={`flex-1 flex flex-col items-center pt-2.5 pb-2 gap-0.5 relative transition-colors
                ${active ? 'text-farm-green' : 'text-gray-400'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                {hasAlert && (
                  <span className="absolute -top-1 -right-1.5 bg-farm-terra text-white text-[8px]
                    w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold">
                    {debtorCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-farm-green' : 'text-gray-400'}`}>
                {label}
              </span>
              {active && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-farm-green rounded-full" />}
            </button>
          )
        })}
      </nav>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
