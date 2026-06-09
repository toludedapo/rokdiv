import React from 'react'
import { Package, Egg, TrendingUp, AlertCircle } from 'lucide-react'
import { fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'

export default function SummaryCards({ sales, collections }) {
  const totalCollected = collections.reduce((s,c)  => s + c.crates*CRATE_SIZE + c.singles, 0)
  const totalSold      = sales.reduce((s,sale)       => s + sale.crates*CRATE_SIZE + sale.singles, 0)
  const inStock        = Math.max(0, totalCollected - totalSold)
  const revenue        = sales.filter(s => s.payment_status==='Paid').reduce((s,sale) => s+Number(sale.amount), 0)
  const debt           = sales.filter(s => s.payment_status==='Credit').reduce((s,sale) => s+Number(sale.amount), 0)
  const debtors        = new Set(sales.filter(s=>s.payment_status==='Credit').map(s=>s.customer_name?.trim().toLowerCase())).size

  const cards = [
    { Icon: Package,     label:'In Stock',    value:inStock.toLocaleString(),     sub:`${Math.floor(inStock/CRATE_SIZE)} crates + ${inStock%CRATE_SIZE} eggs`, accent:'border-l-farm-green',    iconCls:'text-farm-green'       },
    { Icon: Egg,         label:'Collected',   value:totalCollected.toLocaleString(), sub:`${Math.floor(totalCollected/CRATE_SIZE)} crates total`,               accent:'border-l-farm-amber',    iconCls:'text-farm-amber'       },
    { Icon: TrendingUp,  label:'Revenue',     value:fmtNaira(revenue),            sub:'From paid sales',                                                        accent:'border-l-emerald-400',   iconCls:'text-emerald-500'      },
    { Icon: AlertCircle, label:'Owed to You', value:fmtNaira(debt),               sub:`${debtors} customer${debtors!==1?'s':''} on credit`,                   accent:debt>0?'border-l-farm-terra':'border-l-gray-200', iconCls:debt>0?'text-farm-terra':'text-gray-400' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
      {cards.map(({ Icon, label, value, sub, iconCls }, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
            <Icon size={15} className={iconCls} />
          </div>
          <p className="num text-xl font-semibold text-gray-800 leading-none">{value}</p>
          <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  )
}
