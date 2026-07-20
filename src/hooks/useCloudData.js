/**
 * useCloudData — replaces useLocalStorage for all three tables.
 * Fetches on mount, subscribes to real-time changes, and exposes
 * add/update/delete helpers that write directly to Supabase.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = '8592c29c-2d26-4832-93e7-14d264c91631'

// ─── Sales ──────────────────────────────────────────────────────────────────
export function useSales(userId, enteredBy) {
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false })
    setSales(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`sales:${ADMIN_USER_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${ADMIN_USER_ID}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const addSale = async (sale) => {
    const { data, error } = await supabase
      .from('sales')
      .insert({ ...sale, user_id: ADMIN_USER_ID, entered_by: enteredBy ?? null })
      .select()
      .maybeSingle()
    if (!error && data) setSales(prev => [data, ...prev])
    return { error }
  }

  const updateSale = async (id, updates) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const { error } = await supabase.from('sales').update(updates).eq('id', id)
    return { error }
  }

  const deleteSale = async (id) => {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    return { error }
  }

  const markPaid = async (id) => {
    const today = new Date().toISOString().slice(0, 10)
    await updateSale(id, { payment_status: 'Paid', paid_at: today })
  }

  return { sales, loading, addSale, updateSale, deleteSale, markPaid, refetch: fetch }
}

// ─── Collections ────────────────────────────────────────────────────────────
export function useCollections(userId, enteredBy) {
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false })
    setCollections(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`collections:${ADMIN_USER_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${ADMIN_USER_ID}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const addCollection = async (col) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ ...col, user_id: ADMIN_USER_ID, entered_by: enteredBy ?? null })
      .select()
      .maybeSingle()
    if (!error && data) setCollections(prev => [data, ...prev])
    return { error }
  }

  const deleteCollection = async (id) => {
    const { error } = await supabase.from('collections').delete().eq('id', id)
    return { error }
  }

  return { collections, loading, addCollection, deleteCollection, refetch: fetch }
}

// ─── Crate Inventory ────────────────────────────────────────────────────────
export function useCrateInventory(userId) {
  const [inventory, setInventory] = useState({ total_owned: 0 })
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('crate_inventory')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .maybeSingle()
    setInventory(data ?? { total_owned: 0 })
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`crate_inventory:${ADMIN_USER_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crate_inventory', filter: `user_id=eq.${ADMIN_USER_ID}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const setTotalOwned = async (total_owned) => {
    const { error } = await supabase
      .from('crate_inventory')
      .upsert({ user_id: ADMIN_USER_ID, total_owned, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return { error }
  }

  return { inventory, loading, setTotalOwned }
}