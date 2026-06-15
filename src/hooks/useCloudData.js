/**
 * useCloudData — replaces useLocalStorage for all three tables.
 * Fetches on mount, subscribes to real-time changes, and exposes
 * add/update/delete helpers that write directly to Supabase.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Sales ──────────────────────────────────────────────────────────────────
export function useSales(userId) {
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    setSales(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`sales:${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${userId}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const addSale = async (sale) => {
    const { data, error } = await supabase
      .from('sales')
      .insert({ ...sale, user_id: userId })
      .select()
      .maybeSingle()
    if (!error && data) setSales(prev => [data, ...prev])
    return { error }
  }

  const updateSale = async (id, updates) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const { error } = await supabase.from('sales').update(updates).eq('id', id).eq('user_id', userId)
    return { error }
  }

  const deleteSale = async (id) => {
    const { error } = await supabase.from('sales').delete().eq('id', id).eq('user_id', userId)
    return { error }
  }

  const markPaid = async (id) => {
    const today = new Date().toISOString().slice(0, 10)
    await updateSale(id, { payment_status: 'Paid', paid_at: today })
  }

  return { sales, loading, addSale, updateSale, deleteSale, markPaid, refetch: fetch }
}

// ─── Collections ────────────────────────────────────────────────────────────
export function useCollections(userId) {
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    setCollections(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`collections:${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const addCollection = async (col) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ ...col, user_id: userId })
      .select()
      .maybeSingle()
    if (!error && data) setCollections(prev => [data, ...prev])
    return { error }
  }

  const deleteCollection = async (id) => {
    const { error } = await supabase.from('collections').delete().eq('id', id).eq('user_id', userId)
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
      .eq('user_id', userId)
      .maybeSingle()
    setInventory(data ?? { total_owned: 0 })
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`crate_inventory:${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crate_inventory', filter: `user_id=eq.${userId}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const setTotalOwned = async (total_owned) => {
    const { error } = await supabase
      .from('crate_inventory')
      .upsert({ user_id: userId, total_owned, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return { error }
  }

  return { inventory, loading, setTotalOwned }
}