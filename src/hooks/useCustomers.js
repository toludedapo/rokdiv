import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = '8592c29c-2d26-4832-93e7-14d264c91631'

export function useCustomers(userId) {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('name', { ascending: true })
    setCustomers(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`customers:${ADMIN_USER_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `user_id=eq.${ADMIN_USER_ID}` },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const addCustomer = async ({ name, whatsapp, notes }) => {
    const { data, error } = await supabase
      .from('customers')
      .insert({ user_id: ADMIN_USER_ID, name: name.trim(), whatsapp: whatsapp?.trim() || null, notes: notes?.trim() || null })
      .select()
      .maybeSingle()
    if (!error && data) setCustomers(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  const updateCustomer = async (id, updates) => {
    const { error } = await supabase.from('customers').update(updates).eq('id', id)
    if (!error) setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    return { error }
  }

  const deleteCustomer = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) setCustomers(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer }
}
