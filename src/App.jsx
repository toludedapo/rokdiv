import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LayoutDashboard, PlusCircle, Clock, History, LogOut, Download, Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth.jsx'
import { useSales, useCollections, useCrateInventory } from './hooks/useCloudData.js'
import { usePayments } from './hooks/usePayments.js'
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
    <div style={{ minHeight: '100vh', background: '#0E1A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#7AB548' }} />
    </div>
  )
  if (!user) return <AuthScreen />

  return <Dashboard user={user} onSignOut={signOut} />
}

function Dashboard({ user, onSignOut }) {
  const [tab,   setTab]   = useState('dashboard')
  const [toast, setToast] = useState('')

  const showToast = useCallback(msg => setToast(msg), [])

  const { sales,       loading: salesLoading, addSale,        updateSale,        deleteSale,        markPaid      } = useSales(user.id)
  const { collections, loading: collLoading,  addCollection,  deleteCollection                                    } = useCollections(user.id)
  const { inventory,   loading: invLoading,   setTotalOwned                                                       } = useCrateInventory(user.id)
  const { payments,                           addPayment                                                          } = usePayments(user.id)

  const cratesOut  = useMemo(() => sales.reduce((sum, s) => sum + ((s.crates_loaned || 0) - (s.crates_returned || 0)), 0), [sales])
  const cratesInFarm = Math.max(0, (inventory?.total_owned ?? 0) - cratesOut)

  const paymentsTotal = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments])

  const handleReturnCrates = useCallback(async (saleId, newReturned) => {
    await updateSale(saleId, { crates_returned: newReturned })
  }, [updateSale])

  async function clearAll() {
    for (const s of sales)       await deleteSale(s.id)
    for (const c of collections) await deleteCollection(c.id)
    showToast('All records cleared')
  }

  const debtorCount = useMemo(() => computeDebtors(sales, payments).length, [sales, payments])

  // PWA install
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0E1A0A', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Header ── */}
      <header
        style={{
          background: 'linear-gradient(180deg, #1A3A0A 0%, #162010 100%)',
          borderBottom: '1px solid #2D4020',
          padding: `max(14px, env(safe-area-inset-top)) 16px 14px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2D5A18, #1A3A0A)',
              border: '1px solid #3D6A22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🥚
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8', letterSpacing: '-0.01em', lineHeight: 1 }}>
              ROKDIV
            </h1>
            <p style={{ fontSize: 10, color: '#4A6336', lineHeight: 1, marginTop: 2 }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showInstall && (
            <button
              onClick={handleInstall}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 99,
                background: 'rgba(122,181,72,0.15)',
                border: '1px solid rgba(122,181,72,0.3)',
                color: '#9FD46A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Download size={10} /> Install
            </button>
          )}
          <span
            style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#4A6336',
              background: '#1C2A14',
              border: '1px solid #2D4020',
              borderRadius: 99,
              padding: '4px 10px',
            }}
          >
            {todayLabel()}
          </span>
          <button
            onClick={onSignOut}
            title="Sign out"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#1C2A14',
              border: '1px solid #2D4020',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4A6336',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>

        {tab === 'dashboard' && (
          <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SummaryCards sales={sales} collections={collections} paymentsTotal={paymentsTotal} />
            <CrateInventoryCard
              inventory={inventory}
              cratesOut={cratesOut}
              loading={invLoading}
              onSetTotalOwned={setTotalOwned}
            />
            <div
              style={{
                margin: '0 16px',
                background: '#162010',
                border: '1px solid #2D4020',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <p className="label" style={{ marginBottom: 10 }}>Quick Export</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Sales', fn: () => { exportSalesCSV(sales); showToast('Sales CSV downloaded') } },
                  { label: 'Collections', fn: () => { exportCollectionsCSV(collections); showToast('Collections CSV downloaded') } },
                ].map(({ label, fn }) => (
                  <button
                    key={label}
                    onClick={fn}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: '#1C2A14', border: '1px solid #2D4020', borderRadius: 12,
                      padding: '10px 0', fontSize: 12, fontWeight: 600, color: '#6A806A', cursor: 'pointer',
                    }}
                  >
                    <Download size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CollectionForm collections={collections} onSave={addCollection} onDelete={deleteCollection} showToast={showToast} />
            <SalesForm sales={sales} cratesInFarm={cratesInFarm} onSave={addSale} onDelete={deleteSale} onMarkPaid={markPaid} showToast={showToast} />
          </div>
        )}

        {tab === 'credit' && (
          <div style={{ paddingTop: 12 }}>
            <CreditTracker
              sales={sales}
              payments={payments}
              onMarkPaid={markPaid}
              onReturnCrates={handleReturnCrates}
              onAddPayment={addPayment}
              showToast={showToast}
            />
          </div>
        )}

        {tab === 'history' && (
          <div style={{ paddingTop: 12 }}>
            <HistoryLog sales={sales} collections={collections} onClearAll={clearAll} showToast={showToast} />
          </div>
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 480,
          margin: '0 auto',
          background: '#0E1A0A',
          borderTop: '1px solid #2D4020',
          display: 'flex',
          zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active   = tab === id
          const hasAlert = id === 'credit' && debtorCount > 0
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-label={label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 8px',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                color: active ? '#9FD46A' : '#4A6336',
                transition: 'color 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                {hasAlert && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -6,
                      background: '#DC3C28',
                      color: '#fff',
                      fontSize: 8,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      width: 15,
                      height: 15,
                      borderRadius: 99,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {debtorCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    background: 'linear-gradient(90deg, #7AB548, #5A9430)',
                    borderRadius: 99,
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
