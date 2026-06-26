/**
 * ROKDIV Calculations — single source of truth for all business math.
 * Every function here is pure: same input always produces same output,
 * no side effects, no React, no Supabase. This is what makes them testable.
 *
 * Import these into SummaryCards.jsx, ExpenseTracker.jsx, CreditTracker.jsx,
 * etc. instead of duplicating the same math inline in each component.
 */

export const CRATE_SIZE = 30

// ── Egg math ──────────────────────────────────────────────────────────────
export function eggsFromRecord(r) {
  return (parseInt(r.crates || 0) * CRATE_SIZE) + parseInt(r.singles || r.loose_eggs || 0)
}

// ── Date helpers ──────────────────────────────────────────────────────────
export function isInMonth(dateStr, year, month) {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}

export function filterByMonth(records, year, month) {
  return records.filter(r => isInMonth(r.date, year, month))
}

// ── Revenue (paid sales only — credit sales are NOT revenue until paid) ──
export function calcRevenue(sales) {
  return sales
    .filter(s => s.payment_status === 'Paid')
    .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
}

export function calcRevenueForMonth(sales, year, month) {
  return calcRevenue(filterByMonth(sales, year, month))
}

export function calcRevenueTrend(currentRevenue, lastMonthRevenue) {
  if (!lastMonthRevenue || lastMonthRevenue <= 0) return null
  return ((currentRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0)
}

// ── Stock / inventory ─────────────────────────────────────────────────────
export function calcTotalCollectedEggs(collections) {
  return collections.reduce((s, c) => s + eggsFromRecord(c), 0)
}

export function calcTotalSoldEggs(sales) {
  return sales.reduce((s, sale) => s + eggsFromRecord(sale), 0)
}

export function calcTotalSoldCrates(sales) {
  return sales.reduce((s, sale) => s + parseInt(sale.crates || 0), 0)
}

export function calcInStockEggs(collections, sales) {
  return Math.max(0, calcTotalCollectedEggs(collections) - calcTotalSoldEggs(sales))
}

export function calcInStockCrates(inStockEggs) {
  return Math.floor(inStockEggs / CRATE_SIZE)
}

export function calcInStockSingles(inStockEggs) {
  return inStockEggs % CRATE_SIZE
}

// ── Run-rate / days remaining ─────────────────────────────────────────────
export function calcRunRate(sales, now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 7)
  const recent = sales.filter(s => new Date(s.date) >= cutoff)
  if (!recent.length) return null
  return calcTotalSoldEggsForRunRate(recent) / 7
}

function calcTotalSoldEggsForRunRate(sales) {
  return sales.reduce((s, sale) => s + eggsFromRecord(sale), 0)
}

export function calcDaysLeft(inStockEggs, runRate) {
  if (!runRate || runRate <= 0 || inStockEggs <= 0) return null
  return Math.round(inStockEggs / runRate)
}

export function stockSignalFor(daysLeft) {
  if (daysLeft === null) return 'gray'
  if (daysLeft >= 20) return 'green'
  if (daysLeft >= 10) return 'orange'
  return 'red'
}

export function stockLabelFor(daysLeft) {
  if (daysLeft === null) return 'No data yet'
  if (daysLeft >= 20) return 'Healthy'
  if (daysLeft >= 10) return 'Getting low'
  return 'Critical'
}

// ── Outstanding / credit ──────────────────────────────────────────────────
export function buildPaidBySaleMap(payments) {
  const map = {}
  for (const p of payments) {
    map[p.sale_id] = (map[p.sale_id] || 0) + parseFloat(p.amount || 0)
  }
  return map
}

export function calcSaleBalance(sale, paidBySaleMap) {
  const paid = sale.payment_status === 'Paid'
    ? parseFloat(sale.amount || 0)
    : (paidBySaleMap[sale.id] || 0)
  return Math.max(0, parseFloat(sale.amount || 0) - paid)
}

export function calcOutstanding(sales, payments) {
  const paidBySaleMap = buildPaidBySaleMap(payments)
  const creditSales = sales.filter(s => s.payment_status === 'Credit' && !s.paid_at)
  return creditSales.reduce((sum, s) => {
    return sum + Math.max(0, parseFloat(s.amount || 0) - (paidBySaleMap[s.id] || 0))
  }, 0)
}

export function calcCreditSalesCount(sales) {
  return sales.filter(s => s.payment_status === 'Credit' && !s.paid_at).length
}

// ── Debtor aggregation (used in CreditTracker) ────────────────────────────
export function buildDebtors(sales, payments) {
  const paidBySaleMap = buildPaidBySaleMap(payments)
  const creditSales = sales.filter(s =>
    s.payment_status === 'Credit' || (s.payment_status === 'Paid' && s.paid_at)
  )
  const map = {}
  creditSales.forEach(s => {
    const name = s.customer_name || 'Unknown'
    if (!map[name]) map[name] = { name, sales: [], originalTotal: 0, oldest: s.date }
    map[name].sales.push(s)
    map[name].originalTotal += parseFloat(s.amount || 0)
    if (s.date < map[name].oldest) map[name].oldest = s.date
  })
  return Object.values(map).map(d => {
    const totalPaid = d.sales.reduce((s, sale) => {
      if (sale.payment_status === 'Paid') return s + parseFloat(sale.amount || 0)
      return s + (paidBySaleMap[sale.id] || 0)
    }, 0)
    const remaining = Math.max(0, d.originalTotal - totalPaid)
    const isSettled = d.sales.every(s => s.payment_status === 'Paid') || remaining === 0
    return { ...d, totalPaid, remaining, isSettled }
  }).sort((a, b) => new Date(a.oldest) - new Date(b.oldest))
}

export function calcTotalOutstandingFromDebtors(debtors) {
  return debtors.reduce((s, d) => s + d.remaining, 0)
}

export function calcOverdueCount(debtors, now = new Date(), thresholdDays = 14) {
  return debtors.filter(d => {
    if (d.isSettled) return false
    const days = Math.floor((now - new Date(d.oldest)) / 86400000)
    return days > thresholdDays
  }).length
}

export function agingDays(dateStr, now = new Date()) {
  return Math.floor((now - new Date(dateStr)) / 86400000)
}

// ── Crates out (loaned but not returned) ──────────────────────────────────
export function calcCratesOut(sales) {
  return sales.reduce((s, sale) => {
    return s + Math.max(0, parseInt(sale.crates_loaned || 0) - parseInt(sale.crates_returned || 0))
  }, 0)
}

export function buildCratesOutCustomers(sales) {
  const map = {}
  sales.forEach(s => {
    const loaned = parseInt(s.crates_loaned || 0)
    const returned = parseInt(s.crates_returned || 0)
    const outstanding = loaned - returned
    if (outstanding <= 0) return
    const name = s.customer_name || 'Unknown'
    if (!map[name]) map[name] = { name, sales: [], totalOut: 0 }
    map[name].sales.push({ ...s, outstanding })
    map[name].totalOut += outstanding
  })
  return Object.values(map).sort((a, b) => b.totalOut - a.totalOut)
}

// ── Expenses / P&L ─────────────────────────────────────────────────────────
export function calcTotalExpenses(expenses) {
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
}

export function calcExpensesForMonth(expenses, year, month) {
  return calcTotalExpenses(filterByMonth(expenses, year, month))
}

export function calcNetProfit(revenue, expenses) {
  return revenue - expenses
}

export function calcMargin(netProfit, revenue) {
  if (!revenue || revenue <= 0) return null
  return ((netProfit / revenue) * 100).toFixed(1)
}

// ── Top buyers / largest debts (Home dashboard widgets) ───────────────────
export function calcTopBuyers(sales, limit = 3) {
  const map = {}
  sales.forEach(s => {
    const name = s.customer_name || 'Unknown'
    if (!map[name]) map[name] = { name, amount: 0, crates: 0 }
    map[name].amount += parseFloat(s.amount || 0)
    map[name].crates += parseInt(s.crates || 0)
  })
  return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, limit)
}

export function calcTopDebts(sales, payments, limit = 3) {
  const paidBySaleMap = buildPaidBySaleMap(payments)
  const creditSales = sales.filter(s => s.payment_status === 'Credit' && !s.paid_at)
  const map = {}
  creditSales.forEach(s => {
    const name = s.customer_name || 'Unknown'
    const remaining = Math.max(0, parseFloat(s.amount || 0) - (paidBySaleMap[s.id] || 0))
    if (!map[name]) map[name] = { name, remaining: 0 }
    map[name].remaining += remaining
  })
  return Object.values(map).sort((a, b) => b.remaining - a.remaining).slice(0, limit)
}

// ── Collection streak ──────────────────────────────────────────────────────
export function calcCollectionStreak(collections, now = new Date()) {
  const dates = [...new Set(collections.map(c => c.date))].sort().reverse()
  if (!dates.length) return 0
  let count = 0
  let cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  for (const d of dates) {
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor - day) / 86400000)
    if (diff === 0 || diff === 1) {
      count++
      cursor = day
    } else break
  }
  return count
}


// ── WhatsApp number normalization (used in CustomerManager + CreditTracker) ─
export function normalizeWhatsApp(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1)
  if (digits.length === 10) return '234' + digits
  return digits
}

export function buildWaLink(number, message = '') {
  const normalized = normalizeWhatsApp(number)
  if (!normalized) return null
  return `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

// ── CSV row-shaping (pure data logic, separated from browser download mechanics) ─
// The actual file-download trigger (Blob, createObjectURL, click()) lives in
// exportUtils.js and can't be unit tested since it requires a real browser DOM.
// This function is the part that decides WHAT data goes in the CSV — that's
// the part worth testing, since it's where the "Amount Paid" / "Balance"
// calculation bug could hide.
export function buildSalesCSVRows(sales, payments = []) {
  const paidMap = buildPaidBySaleMap(payments)
  return sales.map(s => {
    const amountPaid = s.payment_status === 'Paid'
      ? parseFloat(s.amount || 0)
      : (paidMap[s.id] || 0)
    const balance = Math.max(0, parseFloat(s.amount || 0) - amountPaid)
    return {
      'Date':             s.date,
      'Customer':         s.customer_name,
      'Crates Sold':      s.crates,
      'Single Eggs':      s.singles,
      'Total Eggs':       s.crates * CRATE_SIZE + s.singles,
      'Amount (₦)':       s.amount,
      'Amount Paid (₦)':  amountPaid,
      'Balance (₦)':      balance,
      'Payment Status':   s.payment_status,
      'Paid At':          s.paid_at || '',
      'Crates Loaned':    s.crates_loaned || 0,
      'Crates Returned':  s.crates_returned || 0,
      'Notes':            s.notes || '',
    }
  })
}

export function buildCollectionsCSVRows(collections) {
  return collections.map(c => ({
    'Date':        c.date,
    'Crates':      c.crates,
    'Single Eggs': c.singles,
    'Total Eggs':  c.crates * CRATE_SIZE + c.singles,
    'Notes':       c.notes || '',
  }))
}
