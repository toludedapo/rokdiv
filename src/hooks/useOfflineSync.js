import { useState, useEffect, useCallback, useRef } from 'react'

const OFFLINE_SALES_KEY       = 'offline_sales'
const OFFLINE_COLLECTIONS_KEY = 'offline_collections'
const SYNC_INTERVAL_MS        = 30_000

function readQueue(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function writeQueue(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch (e) { console.warn('localStorage write failed', e) }
}

function removeFromQueue(key, id) {
  writeQueue(key, readQueue(key).filter(item => item.id !== id))
}

export function useOfflineSync({ addSale, addCollection, showToast }) {
  const [offlineSales,       setOfflineSales]       = useState(() => readQueue(OFFLINE_SALES_KEY))
  const [offlineCollections, setOfflineCollections] = useState(() => readQueue(OFFLINE_COLLECTIONS_KEY))
  const [isSyncing,          setIsSyncing]          = useState(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    setOfflineSales(readQueue(OFFLINE_SALES_KEY))
    setOfflineCollections(readQueue(OFFLINE_COLLECTIONS_KEY))
  }, [])

  const runSync = useCallback(async () => {
    if (syncingRef.current) return
    if (!navigator.onLine) return
    const pendingSales       = readQueue(OFFLINE_SALES_KEY)
    const pendingCollections = readQueue(OFFLINE_COLLECTIONS_KEY)
    if (!pendingSales.length && !pendingCollections.length) return

    syncingRef.current = true
    setIsSyncing(true)
    let syncedCount = 0

    for (const item of pendingCollections) {
      try {
        const { id, isOffline, _offlineAt, ...payload } = item
        await addCollection(payload)
        removeFromQueue(OFFLINE_COLLECTIONS_KEY, id)
        syncedCount++
      } catch (e) { console.warn('sync error', e) }
    }

    for (const item of pendingSales) {
      try {
        const { id, isOffline, _offlineAt, ...payload } = item
        await addSale(payload)
        removeFromQueue(OFFLINE_SALES_KEY, id)
        syncedCount++
      } catch (e) { console.warn('sync error', e) }
    }

    setOfflineSales(readQueue(OFFLINE_SALES_KEY))
    setOfflineCollections(readQueue(OFFLINE_COLLECTIONS_KEY))
    if (syncedCount > 0) showToast(`${syncedCount} offline record${syncedCount !== 1 ? 's' : ''} synced ✓`)
    syncingRef.current = false
    setIsSyncing(false)
  }, [addSale, addCollection, showToast])

  useEffect(() => {
    const handleOnline = () => setTimeout(runSync, 800)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [runSync])

  useEffect(() => {
    const interval = setInterval(runSync, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [runSync])

  useEffect(() => {
    if (navigator.onLine) setTimeout(runSync, 2000)
  }, [runSync])

  const queueCollection = useCallback((record) => {
    const item = { ...record, id: record.id || crypto.randomUUID(), isOffline: true, _offlineAt: new Date().toISOString() }
    const current = readQueue(OFFLINE_COLLECTIONS_KEY)
    if (!current.find(c => c.id === item.id)) {
      writeQueue(OFFLINE_COLLECTIONS_KEY, [item, ...current])
      setOfflineCollections(prev => prev.find(c => c.id === item.id) ? prev : [item, ...prev])
    }
    return item
  }, [])

  const queueSale = useCallback((record) => {
    const item = { ...record, id: record.id || crypto.randomUUID(), isOffline: true, _offlineAt: new Date().toISOString() }
    const current = readQueue(OFFLINE_SALES_KEY)
    if (!current.find(s => s.id === item.id)) {
      writeQueue(OFFLINE_SALES_KEY, [item, ...current])
      setOfflineSales(prev => prev.find(s => s.id === item.id) ? prev : [item, ...prev])
    }
    return item
  }, [])

  return { offlineSales, offlineCollections, isSyncing, queueSale, queueCollection, runSync }
}
