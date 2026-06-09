// ── Payments hook — add this to your existing useCloudData.js file ──────────
// Or create a new file src/hooks/usePayments.js and import from there.
//
// usePayments(userId) returns:
//   payments      — array of payment records
//   loading       — bool
//   addPayment    — async ({ sale_id, amount, date, notes }) => void
//   deletePayment — async (id) => void
//
// Example usage in App.jsx:
//   import { usePayments } from './hooks/usePayments'
//   const { payments, addPayment } = usePayments(user.id)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'  // adjust path if needed

export function usePayments(userId) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    // Initial fetch
    supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPayments(data)
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel(`payments:${userId}`)
      .on(
        'postgres_changes',
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

  const addPayment = useCallback(async ({ sale_id, amount, date, notes }) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ user_id: userId, sale_id, amount, date, notes }])
      .select()
      .single()
    if (error) throw error
    setPayments(prev => [data, ...prev])
  }, [userId])

  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) throw error
    setPayments(prev => prev.filter(p => p.id !== id))
  }, [])

  return { payments, loading, addPayment, deletePayment }
}
