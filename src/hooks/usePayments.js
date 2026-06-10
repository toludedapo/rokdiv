import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePayments(userId) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPayments(data)
        setLoading(false)
      })

    const channel = supabase
      .channel(`payments:${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${userId}` },
        () => {
          supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setPayments(data) })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  // FIX: return {error} instead of throwing so callers don't need try/catch
  const addPayment = useCallback(async ({ sale_id, amount, date, notes, user_id }) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ user_id: user_id || userId, sale_id, amount, date, notes }])
      .select()
      .maybeSingle()
    if (!error && data) setPayments(prev => [data, ...prev])
    return { data, error }
  }, [userId])

  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (!error) setPayments(prev => prev.filter(p => p.id !== id))
    return { error }
  }, [])

  return { payments, loading, addPayment, deletePayment }
}
