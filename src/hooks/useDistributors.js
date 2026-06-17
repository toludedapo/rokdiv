import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDistributors() {
  const [distributors, setDistributors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      // Get all distributors
      const { data: dists } = await supabase
        .from('distributors')
        .select('*')
        .eq('active', true)
        .order('full_name')

      if (!dists?.length) { setDistributors([]); setLoading(false); return }

      // Get stock for all distributors
      const { data: stock } = await supabase
        .from('distributor_stock')
        .select('*')
        .in('distributor_id', dists.map(d => d.id))
        .order('batch_number', { ascending: true })

      // Get farm payments for all distributors
      const { data: payments } = await supabase
        .from('distributor_farm_payments')
        .select('*')
        .in('distributor_id', dists.map(d => d.id))
        .eq('confirmed', true)

      // Build distributor summaries
      const result = dists.map(d => {
        const dStock = (stock || []).filter(s => s.distributor_id === d.id)
        const dPayments = (payments || []).filter(p => p.distributor_id === d.id)

        const totalCrates = dStock.reduce((s, r) => s + parseInt(r.crates || 0), 0)
        const totalValue = dStock.reduce((s, r) => s + parseFloat(r.total_value || 0), 0)
        const totalPaid = dPayments.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
        const farmCratesIssued = dStock.reduce((s, r) => s + parseInt(r.farm_crates_issued || 0), 0)
        const farmCratesReturned = dStock.reduce((s, r) => s + parseInt(r.farm_crates_returned || 0), 0)

        // Per-batch payment tracking
        const paidByBatch = {}
        dPayments.forEach(p => {
          paidByBatch[p.stock_id] = (paidByBatch[p.stock_id] || 0) + parseFloat(p.amount || 0)
        })

        const batches = dStock.filter(s => s.total_value > 0).map(s => ({
          id: s.id,
          batchNumber: s.batch_number,
          date: s.date,
          crates: s.crates,
          pricePerCrate: parseFloat(s.price_per_crate || 0),
          totalValue: parseFloat(s.total_value || 0),
          paid: paidByBatch[s.id] || 0,
          owing: Math.max(0, parseFloat(s.total_value || 0) - (paidByBatch[s.id] || 0))
        }))

        return {
          ...d,
          totalCrates,
          totalValue,
          totalPaid,
          totalOwing: Math.max(0, totalValue - totalPaid),
          farmCratesOut: Math.max(0, farmCratesIssued - farmCratesReturned),
          batches
        }
      })

      setDistributors(result)
    } catch (e) {
      console.error('useDistributors error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { distributors, loading, refetch: fetch }
}
