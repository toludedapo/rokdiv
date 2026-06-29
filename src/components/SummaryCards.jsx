import { useMemo, useState } from 'react'
import {
  eggsFromRecord, CRATE_SIZE,
  calcRevenue, calcRevenueTrend,
  calcTotalCollectedEggs, calcTotalSoldEggs, calcTotalSoldCrates,
  calcInStockEggs, calcInStockCrates, calcInStockSingles,
  calcRunRate, calcDaysLeft, stockSignalFor, stockLabelFor,
  calcOutstanding, buildPaidBySaleMap,
  calcTotalExpenses, calcNetProfit,
  calcTopBuyers, calcTopDebts, calcCollectionStreak,
  filterByMonth,
} from '../lib/calculations'

const NAIRA = String.fromCharCode(0x20A6)
const fmt = (n) => NAIRA + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })

// ── Signal colors — fixed meaning everywhere, no exceptions ─────────────────
const SIGNAL = {
  green:  '#34C759', // healthy / paid / success
  red:    '#FF453A', // overdue / urgent
  orange: '#FF9F0A', // warning / low stock
  blue:   '#0A84FF', // primary action
  gray:   '#8E8E93', // neutral / routine
}
const TINT = {
  green:  'rgba(52,199,89,0.16)',
  red:    'rgba(255,69,58,0.16)',
  orange: 'rgba(255,159,10,0.16)',
  blue:   'rgba(10,132,255,0.16)',
}

// ── Collection Trend Chart ───────────────────────────────────────────────────
export function CollectionChart({ collections }) {
  const [range, setRange] = useState(14)
  const today = new Date()
  today.setHours(0,0,0,0)
  const todayStr = today.toISOString().slice(0,10)

  const data = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (range - 1 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const eggs = collections
        .filter(c => c.date === dateStr)
        .reduce((s, c) => s + eggsFromRecord(c), 0)
      const isToday = dateStr === todayStr
      const dayNum = d.toLocaleDateString('en-NG', { day: 'numeric' })
      const monthShort = d.toLocaleDateString('en-NG', { month: 'short' })
      return { date: dateStr, eggs, isToday, dayNum, monthShort, fullLabel: `${dayNum} ${monthShort}` }
    })
  }, [collections, range])

  const daysWithData = data.filter(d => d.eggs > 0)
  const avg = daysWithData.length > 0
    ? daysWithData.reduce((s, d) => s + d.eggs, 0) / daysWithData.length
    : 0
  const max = Math.max(...data.map(d => d.eggs), avg * 1.2, 300)
  const W = 100
  const H = 44
  const slotW = W / range
  const barW = Math.max(slotW * 0.7, 1)
  const barOffset = (slotW - barW) / 2

  const labelIndices = new Set([0, Math.floor(range/2), range-1])
  if (range === 7) [0,2,4,6].forEach(i => labelIndices.add(i))
  if (range === 14) [0,3,6,9,13].forEach(i => labelIndices.add(i))
  if (range === 30) [0,6,13,20,29].forEach(i => labelIndices.add(i))

  return (
    <div style={cardSurface}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <div>
          <p style={label}>Collection trend</p>
          <p style={{ margin:0, fontSize:'12px', color:'#8E8E93' }}>
            {daysWithData.length > 0
              ? <>avg <span style={{ fontWeight:500, color:'#1C1C1E' }}>{Math.round(avg).toLocaleString()}</span> eggs/day · {daysWithData.length} active day{daysWithData.length!==1?'s':''}</>
              : 'No data yet'}
          </p>
        </div>
        <div style={{ display:'flex', gap:'4px' }}>
          {[7, 14, 30].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding:'4px 9px', borderRadius:'8px', fontSize:'11px', fontWeight:500,
              border:'none',
              background: range === r ? '#1C1C1E' : '#F2F2F7',
              color: range === r ? '#FFFFFF' : '#8E8E93', cursor:'pointer'
            }}>{r}d</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 100 ${H + 14}`} style={{ width:'100%', display:'block' }} preserveAspectRatio="none">
        {avg > 0 && (
          <line x1="0" y1={H-(avg/max)*H} x2="100" y2={H-(avg/max)*H}
            stroke="#D1D1D6" strokeWidth="0.35" strokeDasharray="1.5,1" />
        )}
        {data.map((d, i) => {
          const barH = max > 0 ? (d.eggs / max) * H : 0
          const x = i * slotW + barOffset
          const isAbove = avg > 0 ? d.eggs >= avg && d.eggs > 0 : d.eggs > 0
          const showLabel = labelIndices.has(i)
          return (
            <g key={d.date}>
              <rect
                x={x} y={H - barH}
                width={barW}
                height={Math.max(barH, d.eggs > 0 ? 0.8 : 0)}
                rx="1"
                fill={d.eggs === 0 ? '#F2F2F7' : isAbove ? '#1C1C1E' : '#D1D1D6'}
                opacity={d.isToday ? 1 : 0.85}
              />
              {d.isToday && d.eggs > 0 && (
                <circle cx={x + barW/2} cy={H - barH - 2} r="1" fill={SIGNAL.orange} />
              )}
              {showLabel && (
                <text
                  x={x + barW/2} y={H + 10}
                  textAnchor="middle" fontSize="2.8"
                  fill={d.isToday ? '#1C1C1E' : '#8E8E93'}
                  fontWeight={d.isToday ? '500' : '400'}>
                  {d.isToday ? 'Today' : d.fullLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ display:'flex', gap:'12px', marginTop:'4px' }}>
        <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#8E8E93' }}>
          <span style={{ width:7, height:7, borderRadius:2, background:'#1C1C1E', display:'inline-block' }} />
          Above avg
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#8E8E93' }}>
          <span style={{ width:7, height:7, borderRadius:2, background:'#D1D1D6', display:'inline-block' }} />
          Below avg
        </span>
        {daysWithData.length < 3 && (
          <span style={{ fontSize:'11px', color:'#C7C7CC', marginLeft:'auto' }}>
            More data = better avg
          </span>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ ...cardSurface, overflow:'hidden' }}>
      <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'10px', width:'50%', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#D1D1D6', borderRadius:'6px', height:'28px', width:'70%', marginBottom:'8px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'10px', width:'40%', animation:'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function SkeletonHero() {
  return (
    <div style={{ background:'#0D0D0D', borderRadius:'20px', padding:'1.5rem', overflow:'hidden' }}>
      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'6px', height:'12px', width:'30%', marginBottom:'14px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:'8px', height:'48px', width:'40%', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'6px', height:'10px', width:'55%', animation:'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

export default function SummaryCards({ collections = [], sales = [], expenses = [], payments = [], isDesktop = false, loading = false }) {
  const now = new Date()
  const [buyersPeriod, setBuyersPeriod] = useState('month') // 'month' | '3m' | 'all' | 'custom'
  const [buyersFrom, setBuyersFrom] = useState('')
  const [buyersTo, setBuyersTo] = useState(() => new Date().toISOString().slice(0, 10))

  // ── All business math now lives in src/lib/calculations.js — these are
  // thin wrappers that just feed the live data in. The logic itself is
  // unit-tested there, so this component only has to handle rendering.
  const runRate = useMemo(() => calcRunRate(sales, now), [sales])

  const totalCollected = useMemo(() => calcTotalCollectedEggs(collections), [collections])
  const totalSoldEggs  = useMemo(() => calcTotalSoldEggs(sales), [sales])
  const totalSoldCrates = useMemo(() => calcTotalSoldCrates(sales), [sales])
  const inStockEggs    = useMemo(() => calcInStockEggs(collections, sales), [collections, sales])
  const inStockCrates  = calcInStockCrates(inStockEggs)
  const inStockSingles = calcInStockSingles(inStockEggs)

  const daysLeft = calcDaysLeft(inStockEggs, runRate)
  const stockSignal = stockSignalFor(daysLeft)
  const stockLabel = stockLabelFor(daysLeft)

  const thisMonthSales = useMemo(
    () => filterByMonth(sales, now.getFullYear(), now.getMonth()),
    [sales]
  )

  const monthRevenue = useMemo(() => calcRevenue(thisMonthSales), [thisMonthSales])

  const lastMonthRevenue = useMemo(() => {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return calcRevenue(filterByMonth(sales, lastMonth.getFullYear(), lastMonth.getMonth()))
  }, [sales])

  const revenueTrend = calcRevenueTrend(monthRevenue, lastMonthRevenue)

  const monthExpenses = useMemo(
    () => calcTotalExpenses(filterByMonth(expenses, now.getFullYear(), now.getMonth())),
    [expenses]
  )

  const netProfit = calcNetProfit(monthRevenue, monthExpenses)
  const hasExpenseData = monthExpenses > 0

  const creditSales = useMemo(() => sales.filter(s => s.payment_status==='Credit'&&!s.paid_at), [sales])
  const paidBySale  = useMemo(() => buildPaidBySaleMap(payments), [payments])
  const outstanding = useMemo(() => calcOutstanding(sales, payments), [sales, payments])

  const streak = useMemo(() => calcCollectionStreak(collections, now), [collections])

  // REGRESSION FIX: previously only summed the `crates` field, silently
  // dropping every collection's `singles` count. A month with e.g. 97
  // singles spread across several entries would undercount by 3+ crates
  // even though the bot's egg-based status report included them correctly.
  // Now we total actual eggs first, then convert back to crates+singles,
  // matching exactly how the bot (and Stock Remaining above) already do it.
  const monthCollectedEggs = useMemo(() => {
    return filterByMonth(collections, now.getFullYear(), now.getMonth())
      .reduce((s, c) => s + eggsFromRecord(c), 0)
  }, [collections])
  const monthCollectedCrates = Math.floor(monthCollectedEggs / CRATE_SIZE)
  const monthCollectedSingles = monthCollectedEggs % CRATE_SIZE

  const buyersScopedSales = useMemo(() => {
    if (buyersPeriod === 'month') return thisMonthSales
    if (buyersPeriod === '3m') {
      const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3)
      return sales.filter(s => new Date(s.date) >= cutoff)
    }
    if (buyersPeriod === 'custom') {
      if (!buyersFrom && !buyersTo) return sales
      return sales.filter(s => {
        const d = s.date
        if (buyersFrom && d < buyersFrom) return false
        if (buyersTo && d > buyersTo) return false
        return true
      })
    }
    return sales // 'all'
  }, [buyersPeriod, thisMonthSales, sales, buyersFrom, buyersTo])

  const topBuyers = useMemo(() => calcTopBuyers(buyersScopedSales, 3), [buyersScopedSales])
  const topDebts = useMemo(() => calcTopDebts(sales, payments, 3), [sales, payments])

  if (loading) {
    return (
      <div>
        <SkeletonHero />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', margin:'12px 0' }}>
          <SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    )
  }

  const stockBarSegments = 10
  const filledSegments = daysLeft === null ? 0 : Math.min(stockBarSegments, Math.max(1, Math.round((daysLeft / 30) * stockBarSegments)))

  return (
    <div>
      {streak >= 2 && (
        <div style={{ background:'#F2F2F7', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:SIGNAL.orange, flexShrink:0 }} />
          <span style={{ fontSize:'13px', color:'#1C1C1E' }}>
            <span style={{ fontWeight:500 }}>{streak}-day collection streak</span>
            <span style={{ color:'#8E8E93', marginLeft:'6px' }}>keep it up</span>
          </span>
        </div>
      )}

      <div style={{ background:'#0D0D0D', borderRadius:'20px', padding: isDesktop?'1.75rem':'1.5rem', marginBottom: isDesktop?'14px':'10px', position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'4px' }}>
          <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', margin:0 }}>Stock remaining</p>
          <span style={{
            fontSize:'11px', fontWeight:500, padding:'3px 9px', borderRadius:'99px',
            color: SIGNAL[stockSignal], background: TINT[stockSignal] || 'rgba(142,142,147,0.16)'
          }}>{stockLabel}</span>
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'2px' }}>
          <span style={{ fontSize: isDesktop?'72px':'56px', fontWeight:500, color:'#FFFFFF', letterSpacing:'-0.03em', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
            {inStockCrates.toLocaleString()}
          </span>
          <span style={{ fontSize:'16px', color:'rgba(255,255,255,0.55)', fontWeight:400 }}>crates</span>
        </div>
        <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', margin:'0 0 18px' }}>
          {inStockEggs.toLocaleString()} eggs{inStockSingles > 0 ? ` (+${inStockSingles})` : ''}
          {daysLeft !== null ? ` · roughly ${daysLeft} day${daysLeft!==1?'s':''} at current pace` : ''}
        </p>
        <div style={{ display:'flex', gap:'3px', height:'4px' }}>
          {Array.from({ length: stockBarSegments }, (_, i) => (
            <div key={i} style={{
              flex:1, borderRadius: i===0 ? '2px 0 0 2px' : i===stockBarSegments-1 ? '0 2px 2px 0' : '0',
              background: i < filledSegments ? SIGNAL[stockSignal] : 'rgba(255,255,255,0.22)'
            }} />
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: isDesktop?'14px':'10px', marginBottom: isDesktop?'14px':'10px' }}>
        <div style={cardSurface}>
          <p style={label}>Revenue ({thisMonthSales.length} sale{thisMonthSales.length!==1?'s':''})</p>
          <p style={{ ...statValue, fontSize: isDesktop?'30px':'24px' }}>{fmt(monthRevenue)}</p>
          {revenueTrend !== null && (
            <p style={{ margin:'4px 0 0', fontSize:'12px', fontWeight:500, color: Number(revenueTrend)>=0 ? SIGNAL.green : SIGNAL.red }}>
              {Number(revenueTrend)>=0?'↑':'↓'} {Math.abs(revenueTrend)}% vs last month
            </p>
          )}
        </div>

        <div style={cardSurface}>
          <p style={label}>Outstanding</p>
          <p style={{ ...statValue, fontSize: isDesktop?'30px':'24px', color: outstanding>0 ? SIGNAL.red : SIGNAL.green }}>
            {outstanding>0 ? fmt(outstanding) : 'Clear'}
          </p>
          <p style={{ ...sub, marginTop:'4px' }}>
            {outstanding>0?`${creditSales.length} debtor${creditSales.length!==1?'s':''}`:'No unpaid credit'}
          </p>
        </div>
      </div>

      {hasExpenseData ? (
        <div style={{ ...cardSurface, marginBottom: isDesktop?'14px':'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={label}>{netProfit>=0?'Net profit':'Net loss'} (month)</p>
            <p style={{ ...statValue, fontSize: isDesktop?'30px':'24px', color: netProfit>=0 ? '#1C1C1E' : SIGNAL.red }}>{fmt(Math.abs(netProfit))}</p>
          </div>
          <p style={sub}>after {fmt(monthExpenses)} expenses</p>
        </div>
      ) : (
        <div style={{ ...cardSurface, marginBottom: isDesktop?'14px':'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={label}>Collected this month</p>
            <p style={{ ...statValue, fontSize: isDesktop?'30px':'24px' }}>
              {monthCollectedCrates.toLocaleString()}
              <span style={{ fontSize:'14px', fontWeight:400, color:'#8E8E93', marginLeft:'4px' }}>
                crates{monthCollectedSingles > 0 ? ` +${monthCollectedSingles}` : ''}
              </span>
            </p>
          </div>
          <p style={sub}>Log expenses to see profit</p>
        </div>
      )}

      <div style={{ ...cardSurface, marginBottom: isDesktop?'14px':'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={label}>Total crates sold</p>
          <p style={statValue}>
            {totalSoldCrates.toLocaleString()}
            <span style={{ fontSize:'13px', fontWeight:400, color:'#8E8E93', marginLeft:'4px' }}>crates</span>
          </p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ ...label, margin:'0 0 4px' }}>This month</p>
          <p style={{ ...statValue, fontSize:'16px' }}>
            {thisMonthSales.reduce((s,sale) => s+parseInt(sale.crates||0), 0).toLocaleString()}
            <span style={{ fontSize:'12px', fontWeight:400, color:'#8E8E93', marginLeft:'4px' }}>crates</span>
          </p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom: isDesktop?'14px':'12px' }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('rokdiv-nav', { detail:'collect' }))}
          style={qaBtn(true)}>
          <span style={{ fontSize:'17px' }}>🥚</span>
          <span style={{ fontSize:'13px', fontWeight:500, color:'#FFFFFF' }}>Log collection</span>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('rokdiv-nav', { detail:'sales' }))}
          style={qaBtn(false)}>
          <span style={{ fontSize:'17px' }}>🛒</span>
          <span style={{ fontSize:'13px', fontWeight:500, color:'#1C1C1E' }}>Record sale</span>
        </button>
      </div>

      {(topBuyers.length > 0 || topDebts.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:'10px', marginBottom:'10px' }}>
          {topBuyers.length > 0 && (
            <div style={cardSurface}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <p style={{ ...label, margin:0 }}>Top buyers</p>
                <div style={{ display:'flex', gap:'4px' }}>
                  {[{ key:'month', label:'Month' }, { key:'3m', label:'3mo' }, { key:'all', label:'All' }, { key:'custom', label:'Custom' }].map(opt => (
                    <button key={opt.key} onClick={() => setBuyersPeriod(opt.key)} style={{
                      fontSize:'11px', fontWeight:500, padding:'3px 8px', borderRadius:'20px', border:'none', cursor:'pointer',
                      background: buyersPeriod===opt.key ? '#1C1C1E' : '#F2F2F7',
                      color: buyersPeriod===opt.key ? '#FFFFFF' : '#8E8E93',
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              {buyersPeriod === 'custom' && (
                <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
                  <input type="date" value={buyersFrom} onChange={e => setBuyersFrom(e.target.value)}
                    style={{ flex:1, fontSize:'12px', padding:'5px 8px', borderRadius:'8px', border:'1.5px solid #D1D1D6', color:'#1C1C1E', background:'#FFFFFF' }} />
                  <input type="date" value={buyersTo} onChange={e => setBuyersTo(e.target.value)}
                    style={{ flex:1, fontSize:'12px', padding:'5px 8px', borderRadius:'8px', border:'1.5px solid #D1D1D6', color:'#1C1C1E', background:'#FFFFFF' }} />
                </div>
              )}
              {topBuyers.map((b, i) => (
                <div key={b.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom: i < topBuyers.length-1 ? '0.5px solid #E5E5EA' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'12px', fontWeight:500, color:'#C7C7CC', width:'14px' }}>{i+1}</span>
                    <div>
                      <p style={{ margin:0, fontSize:'14px', color:'#1C1C1E' }}>{b.name}</p>
                      <p style={{ margin:0, fontSize:'12px', color:'#8E8E93' }}>{b.crates} crates</p>
                    </div>
                  </div>
                  <p style={{ margin:0, fontSize:'14px', fontWeight:500, color:'#1C1C1E' }}>{fmt(b.amount)}</p>
                </div>
              ))}
            </div>
          )}
          {topDebts.length > 0 && (
            <div style={cardSurface}>
              <p style={{ ...label, marginBottom: 2 }}>Largest outstanding</p>
              <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#C7C7CC' }}>All-time · not affected by date filters</p>
              {topDebts.map((d, i) => (
                <div key={d.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom: i < topDebts.length-1 ? '0.5px solid #E5E5EA' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:SIGNAL.red, flexShrink:0 }} />
                    <p style={{ margin:0, fontSize:'14px', color:'#1C1C1E' }}>{d.name}</p>
                  </div>
                  <p style={{ margin:0, fontSize:'14px', fontWeight:500, color:SIGNAL.red }}>{fmt(d.remaining)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isDesktop && sales.length > 0 && (
        <div style={{ ...cardSurface, marginTop:'4px' }}>
          <p style={label}>Recent sales</p>
          {[...sales].slice(0,5).map((s,i) => (
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom: i<Math.min(sales.length,5)-1 ? '0.5px solid #E5E5EA' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background: s.payment_status==='Paid' ? TINT.green : TINT.red,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'14px'
                }}>
                  {s.payment_status==='Paid' ? '✓' : '⏱'}
                </div>
                <div>
                  <p style={{ margin:0, fontSize:'14px', color:'#1C1C1E' }}>{s.customer_name}</p>
                  <p style={{ margin:'1px 0 0', fontSize:'12px', color:'#8E8E93' }}>
                    {new Date(s.date).toLocaleDateString('en-NG',{day:'numeric',month:'short'})} · {parseInt(s.crates||0)} crate{parseInt(s.crates||0)!==1?'s':''}
                  </p>
                </div>
              </div>
              <p style={{ margin:0, fontSize:'14px', fontWeight:500, color:'#1C1C1E' }}>
                {NAIRA}{Number(s.amount).toLocaleString('en-NG')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function qaBtn(primary) {
  return {
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
    padding:'14px 8px', background: primary ? '#0D0D0D' : '#FFFFFF',
    border: primary ? 'none' : '1.5px solid #D1D1D6',
    boxShadow: primary ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
    borderRadius:'14px', cursor:'pointer',
  }
}

const cardSurface = {
  background:'#FFFFFF', borderRadius:'16px', padding:'14px',
  border:'1.5px solid #D1D1D6', boxShadow:'0 2px 6px rgba(0,0,0,0.08)',
}
const statValue = {
  margin:'0 0 2px', fontSize:'24px', fontWeight:500, color:'#1C1C1E',
  lineHeight:1.1, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums',
}
const label = {
  margin:'0 0 6px', fontSize:'12px', fontWeight:500, color:'#8E8E93',
}
const sub = { margin:0, fontSize:'12px', color:'#8E8E93' }
