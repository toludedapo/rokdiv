const NAIRA = String.fromCharCode(0x20A6)
const fmt = n => NAIRA + Number(n).toLocaleString('en-NG')

export default function DistributorPanel({ distributors = [], loading = false }) {
  if (loading) return (
    <div style={{ background:'white', borderRadius:'16px', padding:'14px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', marginBottom:'10px' }}>
      <div style={{ background:'#F3F4F6', borderRadius:'6px', height:'10px', width:'40%', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#F3F4F6', borderRadius:'6px', height:'60px', animation:'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )

  if (!distributors.length) return null

  const totalOwing = distributors.reduce((s, d) => s + d.totalOwing, 0)
  const totalCratesOut = distributors.reduce((s, d) => s + d.farmCratesOut, 0)

  return (
    <div style={{ background:'white', borderRadius:'16px', padding:'14px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', marginBottom:'10px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <p style={{ margin:0, fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#9CA3AF' }}>
          📦 Distributor Stock
        </p>
        <div style={{ display:'flex', gap:'8px' }}>
          {totalOwing > 0 && (
            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'99px', background:'#FEF3C7', color:'#92400E' }}>
              {fmt(totalOwing)} owed
            </span>
          )}
          {totalCratesOut > 0 && (
            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'99px', background:'#EEF1FF', color:'#4F6EF7' }}>
              {totalCratesOut} crates out
            </span>
          )}
        </div>
      </div>

      {/* Distributor rows */}
      {distributors.map((d, i) => (
        <div key={d.id} style={{
          padding:'10px 0',
          borderBottom: i < distributors.length - 1 ? '1px solid #F3F4F6' : 'none'
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <p style={{ margin:'0 0 3px', fontSize:'13px', fontWeight:700, color:'#111827' }}>{d.full_name}</p>
              <p style={{ margin:0, fontSize:'11px', color:'#9CA3AF' }}>
                {d.totalCrates} crates · {d.farmCratesOut > 0 ? `🗃️ ${d.farmCratesOut} farm crates` : '✅ No farm crates out'}
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              {d.totalOwing > 0 ? (
                <>
                  <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:800, color:'#F59E0B' }}>{fmt(d.totalOwing)}</p>
                  <p style={{ margin:0, fontSize:'10px', color:'#9CA3AF' }}>owing</p>
                </>
              ) : (
                <span style={{ fontSize:'11px', fontWeight:700, color:'#10B981' }}>✅ Settled</span>
              )}
            </div>
          </div>

          {/* Open batches */}
          {d.batches.filter(b => b.owing > 0).map(b => (
            <div key={b.id} style={{
              marginTop:'6px', padding:'6px 10px', background:'#FFFBEB',
              borderRadius:'8px', border:'1px solid #FDE68A',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <div>
                <p style={{ margin:0, fontSize:'11px', fontWeight:600, color:'#92400E' }}>
                  Batch #{b.batchNumber} · {new Date(b.date).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                </p>
                <p style={{ margin:0, fontSize:'10px', color:'#B45309' }}>
                  {b.crates} crates × {fmt(b.pricePerCrate)} = {fmt(b.totalValue)}
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ margin:0, fontSize:'12px', fontWeight:700, color:'#D97706' }}>{fmt(b.owing)}</p>
                {b.paid > 0 && <p style={{ margin:0, fontSize:'10px', color:'#9CA3AF' }}>{fmt(b.paid)} paid</p>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
