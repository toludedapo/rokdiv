import { useEffect } from 'react'
import { CRATE_SIZE } from '../utils/dateUtils.js'

const LAST_NOTIF_KEY = 'rokdiv_last_weekly_notif'

function getLastMonday() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function fmtRevenue(n) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`
  return `₦${n.toLocaleString()}`
}

export function useWeeklySummary(sales, collections) {
  useEffect(() => {
    if (!('Notification' in window)) return

    async function maybeNotify() {
      const now      = new Date()
      const isMonday = now.getDay() === 1
      const hour     = now.getHours()
      if (!isMonday || hour < 6 || hour > 10) return

      const lastMonday    = getLastMonday()
      const lastMondayStr = lastMonday.toISOString().slice(0, 10)
      if (localStorage.getItem(LAST_NOTIF_KEY) === lastMondayStr) return

      let permission = Notification.permission
      if (permission === 'default') permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const prevMonday  = new Date(lastMonday)
      prevMonday.setDate(prevMonday.getDate() - 7)
      const sinceStr    = prevMonday.toISOString().slice(0, 10)
      const weekSales   = sales.filter(s => s.date >= sinceStr)
      const weekColls   = collections.filter(c => c.date >= sinceStr)
      const revenue     = weekSales.filter(s => s.payment_status === 'Paid').reduce((s, x) => s + Number(x.amount), 0)
      const crates      = weekColls.reduce((s, c) => s + c.crates, 0)
      const debtors     = new Set(weekSales.filter(s => s.payment_status === 'Credit').map(s => s.customer_name?.trim().toLowerCase())).size

      new Notification('ROKDIV Weekly Summary', {
        body: [
          `🥚 ${crates} crates collected`,
          `💰 ${fmtRevenue(revenue)} revenue`,
          debtors > 0 ? `⚠️ ${debtors} debtor${debtors !== 1 ? 's' : ''} outstanding` : `✅ All accounts clear`,
        ].join('\n'),
        icon: '/icons/icon-192.png',
        tag:  'rokdiv-weekly',
      })

      localStorage.setItem(LAST_NOTIF_KEY, lastMondayStr)
    }

    maybeNotify()
    const interval = setInterval(maybeNotify, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [sales, collections])
}
