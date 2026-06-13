import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = '8592c29c-2d26-4832-93e7-14d264c91631'

export function usePayments(userId) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    supabase
      .from('payments')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPayments(data)
        setLoading(false)
      })

    const channel = supabase
      .channel(`payments:${ADMIN_USER_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${ADMIN_USER_ID}` },
        () => {
          supabase
            .from('payments')
            .select('*')
            .eq('user_id', ADMIN_USER_ID)
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
      .insert([{ user_id: ADMIN_USER_ID, sale_id, amount, date, notes }])
      .select()
      .maybeSingle()
    if (!error && data) setPayments(prev => [data, ...prev])
    return { data, error }
  }, [])

  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (!error) setPayments(prev => prev.filter(p => p.id !== id))
    return { error }
  }, [])

  return { payments, loading, addPayment, deletePayment }
}