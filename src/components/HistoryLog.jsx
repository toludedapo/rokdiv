import React, { useState } from 'react'
import { History, Trash2, Download } from 'lucide-react'
import { fmtDate, fmtNaira, CRATE_SIZE } from '../utils/dateUtils.js'
import { exportSalesCSV, exportCollectionsCSV } from '../utils/exportUtils.js'

export default function HistoryLog({ sales, collections, onClearAll, showToast }) {
  const [tab, setTab] = useState('sales')

  const sorted = tab === 'sales'
    ? [...sales].sort((a,b) => a.date < b.date ? 1 : -1)
    : [...collections].sort((a,b) => a.date < b.date ? 1 : -1)

  return (
    <div className="mx-4 space-y-3">
      {/* Export buttons */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2.5">Export Data</p>
        <div className="flex gap-2">
          <button onClick={() => { exportSalesCSV(sales); showToast('Sales CSV downloaded') }}
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-xs text-gray-600 font-medium bg-gray-50 active:scale-[0.98]">
            <Download size={12} /> Sales CSV
          </button>
          <button onClick={() => { exportCollectionsCSV(collections); showToast('Collections CSV downloaded') }}
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-xs text-gray-600 font-medium bg-gray-50 active:scale-[0.98]">
            <Download size={12} /> Collections CSV
          </button>
        </div>
      </div>

      {/* Records */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[['sales','Sales'],['collections','Collections']].map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${tab===id?'text-farm-green border-b-2 border-farm-green -mb-px':'text-gray-400'}`}>
              {lbl} ({id==='sales'?sales.length:collections.length})
            </button>
          ))}
        </div>

        <div className="divide-y divide-gray-100">
          {sorted.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
              <History size={28} className="text-gray-200" />
              No records yet
            </div>
          )}
          {sorted.map(item => (
            tab === 'sales' ? (
              <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.customer_name}</p>
                  <p className="text-[11px] text-gray-400">{fmtDate(item.date)} · {(item.crates*CRATE_SIZE+item.singles).toLocaleString()} eggs</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.payment_status==='Paid'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                      {item.payment_status}
                    </span>
                    {item.crates_loaned > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-farm-amber-light text-farm-amber font-medium">
                        {item.crates_loaned} loaned, {item.crates_returned||0} back
                      </span>
                    )}
                  </div>
                </div>
                <span className="num text-sm font-semibold text-farm-amber flex-shrink-0">{fmtNaira(item.amount)}</span>
              </div>
            ) : (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{fmtDate(item.date)}</p>
                  <p className="text-[11px] text-gray-400">{item.crates} crates + {item.singles} singles · {item.notes||''}</p>
                </div>
                <span className="num text-sm font-semibold text-farm-green">{(item.crates*CRATE_SIZE+item.singles).toLocaleString()}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 px-4 py-3.5">
        <p className="text-xs font-semibold text-red-600 mb-1">Danger Zone</p>
        <p className="text-[11px] text-gray-400 mb-3">Export your data first before clearing.</p>
        <button onClick={() => { if(window.confirm('Delete ALL records permanently?')) onClearAll() }}
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium active:scale-[0.98] transition-all">
          Clear All Data
        </button>
      </div>
    </div>
  )
}
