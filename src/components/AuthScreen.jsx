import React, { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signIn } = useAuth()
  const [email,  setEmail]  = useState('')
  const [pass,   setPass]   = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading,setLoading]= useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !pass.trim()) return setError('Email and password are required.')
    if (pass.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      const { error } = await signIn(email.trim(), pass)
      if (error) setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EEF1FF 0%, #F0F2F5 50%, #F0F2F5 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, #4F6EF7 0%, #3B55E0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
          boxShadow: '0 8px 24px rgba(79,110,247,0.35)',
        }}>
          <span style={{ fontSize: 34 }}>🥚</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
          ROKDIV
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Farm Egg Tracker</p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: '#FFFFFF', borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        padding: '28px 24px',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 22 }}>
          Sign in to your farm
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="field" placeholder="you@email.com" style={{ fontSize: 16 }} />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required
                value={pass} onChange={e => setPass(e.target.value)}
                className="field" placeholder="Enter password"
                style={{ fontSize: 16, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex',
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: '#9CA3AF', textAlign: 'center', maxWidth: 260 }}>
        Data syncs securely across all your devices via Supabase.
      </p>
    </div>
  )
}
