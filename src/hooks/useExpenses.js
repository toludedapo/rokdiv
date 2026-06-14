import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = '8592c29c-2d26-4832-93e7-14d264c91631'

export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchExpenses()

    const channel = supabase
      .channel('expenses_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `user_id=eq.${ADMIN_USER_ID}`
      }, () => fetchExpenses())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false })

    if (!error && data) setExpenses(data)
    setLoading(false)
  }

  async function addExpense({ category, amount, date, notes }) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ user_id: ADMIN_USER_ID, category, amount: parseFloat(amount), date, notes: notes || null }])
      .select()
      .maybeSingle()

    if (!error && data) {
      setExpenses(prev => [data, ...prev])
    }
    return { data, error }
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  function getMonthlySummary(year, month) {
    const filtered = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    const byCategory = filtered.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
      return acc
    }, {})
    return { total, byCategory, count: filtered.length }
  }

  return { expenses, loading, addExpense, deleteExpense, getMonthlySummary }
<<<<<<< Updated upstream
}
=======
}
>>>>>>> Stashed changes
