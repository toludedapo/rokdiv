// Shared loading skeletons — used by every tab that fetches data, so a
// page refresh shows a calm placeholder instead of a flash of "0" or an
// empty list before Supabase resolves.

export function SkeletonCard() {
  return (
    <div style={{ background:'#FFFFFF', borderRadius:'16px', padding:'16px', border:'1.5px solid #D1D1D6', boxShadow:'0 2px 6px rgba(0,0,0,0.08)', overflow:'hidden' }}>
      <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'10px', width:'50%', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#D1D1D6', borderRadius:'6px', height:'24px', width:'60%', marginBottom:'8px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'10px', width:'40%', animation:'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

export function SkeletonHero() {
  return (
    <div style={{ background:'#0D0D0D', borderRadius:'20px', padding:'1.5rem', overflow:'hidden' }}>
      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'6px', height:'12px', width:'30%', marginBottom:'14px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:'8px', height:'48px', width:'40%', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'6px', height:'10px', width:'55%', animation:'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

// Generic "list of rows" skeleton — used by History, Customers, Sales, Collect.
export function SkeletonList({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background:'#F2F2F7', borderRadius:'12px', padding:'12px 14px', overflow:'hidden' }}>
          <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'12px', width: i % 2 === 0 ? '55%' : '40%', marginBottom:'8px', animation:'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'10px', width:'30%', animation:'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  )
}

// Full form-card skeleton — used by CollectionForm/SalesForm, which render
// a form above a list. Shows a quiet card placeholder plus a short list.
export function SkeletonFormWithList() {
  return (
    <div style={{ background:'#FFFFFF', borderRadius:'16px', padding:'16px', border:'1.5px solid #D1D1D6', boxShadow:'0 2px 6px rgba(0,0,0,0.08)' }}>
      <div style={{ background:'#E5E5EA', borderRadius:'6px', height:'12px', width:'35%', marginBottom:'16px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#F2F2F7', borderRadius:'10px', height:'42px', marginBottom:'10px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#F2F2F7', borderRadius:'10px', height:'42px', marginBottom:'16px', animation:'pulse 1.5s ease-in-out infinite' }} />
      <SkeletonList rows={3} />
    </div>
  )
}
