import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [pass,     setPass]     = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Password recovery mode
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPass,    setNewPass]    = useState('')
  const [showNew,    setShowNew]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    // Detect if Supabase redirected here with a recovery token
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
  }, [])

  async function handleSignIn(e) {
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

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    if (!newPass || newPass.length < 6) return setError('Password must be at least 6 characters.')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      setSaved(true)
      // After 2 seconds the auth state change will log them in automatically
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Password recovery screen ────────────────────────────────
  if (isRecovery) {
    return (
      <div style={containerStyle}>
        <div style={logoWrap}>
          <div style={logoBox}><span style={{ fontSize: 34 }}>🥚</span></div>
          <h1 style={logoTitle}>ROKDIV</h1>
          <p style={logoSub}>Set your new password</p>
        </div>

        <div style={cardStyle}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 6 }}>
                Password set successfully
              </p>
              <p style={{ color: '#6B7280', fontSize: 13 }}>
                Logging you in now...
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                Choose a new password
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>
                This will be your password every time you log in to ROKDIV.
              </p>

              <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      className="field"
                      placeholder="Min. 6 characters"
                      style={{ fontSize: 16, paddingRight: 42 }}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)} style={eyeBtn}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && <div style={errorBox}>{error}</div>}

                <button type="submit" disabled={saving} className="btn-primary" style={{ marginTop: 4 }}>
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                    : 'Set Password & Log In'
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Normal sign in screen ───────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={logoWrap}>
        <div style={logoBox}><span style={{ fontSize: 34 }}>🥚</span></div>
        <h1 style={logoTitle}>ROKDIV</h1>
        <p style={logoSub}>Farm Egg Tracker</p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 22 }}>
          Sign in to your farm
        </h2>

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="field" placeholder="you@email.com"
              style={{ fontSize: 16 }}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password" required
                value={pass} onChange={e => setPass(e.target.value)}
                className="field" placeholder="Enter password"
                style={{ fontSize: 16, paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Signing in...</>
              : 'Sign In'
            }
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: '#9CA3AF', textAlign: 'center', maxWidth: 260 }}>
        Data syncs securely across all your devices via Supabase.
      </p>
    </div>
  )
}

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #EEF1FF 0%, #F0F2F5 50%, #F0F2F5 100%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '24px 20px',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
}
const logoWrap = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32
}
const logoBox = {
  width: 72, height: 72, borderRadius: 20,
  background: 'linear-gradient(135deg, #4F6EF7 0%, #3B55E0 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 14, boxShadow: '0 8px 24px rgba(79,110,247,0.35)',
}
const logoTitle = {
  fontSize: 26, fontWeight: 700, color: '#111827',
  letterSpacing: '-0.02em', lineHeight: 1
}
const logoSub = { fontSize: 13, color: '#9CA3AF', marginTop: 4 }
const cardStyle = {
  width: '100%', maxWidth: 360,
  background: '#FFFFFF', borderRadius: 20,
  boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
  padding: '28px 24px',
}
const eyeBtn = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex',
}
const errorBox = {
  background: '#FEF2F2', border: '1px solid #FECACA',
  borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626'
}