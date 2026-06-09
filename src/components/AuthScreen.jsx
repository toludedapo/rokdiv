import React, { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #1C3A10 0%, #0E1A0A 60%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Logo mark */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative"
          style={{
            background: 'linear-gradient(135deg, #2D5A18 0%, #1A3A0A 100%)',
            border: '1px solid #3D6A22',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(122,181,72,0.1) inset',
          }}
        >
          <span style={{ fontSize: 38 }}>🥚</span>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F0EDE8',
            lineHeight: 1,
          }}
        >
          ROKDIV
        </h1>
        <p style={{ color: '#4A6336', fontSize: 13, marginTop: 4 }}>Farm Egg Tracker</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{
          background: '#162010',
          border: '1px solid #2D4020',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', marginBottom: 20 }}>
          Sign in to your farm
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="field"
              placeholder="you@email.com"
              style={{ fontSize: 16 }}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="field"
                placeholder="Enter password"
                style={{ fontSize: 16, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#4A6336',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(220,60,40,0.1)',
                border: '1px solid rgba(220,60,40,0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12,
                color: '#F07060',
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: '#2D4020', textAlign: 'center', maxWidth: 260 }}>
        Data syncs securely across all your devices via Supabase.
      </p>
    </div>
  )
}
