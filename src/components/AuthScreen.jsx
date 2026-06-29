import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SIGNAL = { green: '#34C759', red: '#FF453A' }
const TINT = { red: 'rgba(255,69,58,0.12)' }

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
        <Logo />
        <p style={logoSub}>Set your new password</p>
        <div style={cardStyle}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(52,199,89,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <Check size={24} color={SIGNAL.green} />
              </div>
              <p style={{ fontWeight: 500, color: '#1C1C1E', fontSize: 15, marginBottom: 6 }}>
                Password set successfully
              </p>
              <p style={{ color: '#8E8E93', fontSize: 13 }}>
                Logging you in now…
              </p>
            </div>
          ) : (
            <>
              <h2 style={cardHeading}>Choose a new password</h2>
              <p style={cardSubheading}>This will be your password every time you log in to ROKDIV.</p>
              <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={fieldLabel}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      style={{ ...fieldInput, paddingRight: 42 }}
                      placeholder="Min. 6 characters"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)} style={eyeBtn}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <div style={errorBox}>{error}</div>}
                <button type="submit" disabled={saving} style={primaryBtn}>
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                    : 'Set password & log in'
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
      <Logo />
      <p style={logoSub}>Farm egg tracker</p>
      <div style={cardStyle}>
        <h2 style={cardHeading}>Sign in to your farm</h2>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={fieldLabel}>Email</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={fieldInput} placeholder="you@email.com"
            />
          </div>
          <div>
            <label style={fieldLabel}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password" required
                value={pass} onChange={e => setPass(e.target.value)}
                style={{ ...fieldInput, paddingRight: 42 }} placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div style={errorBox}>{error}</div>}
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
              : 'Sign in'
            }
          </button>
        </form>
      </div>
      <p style={{ marginTop: 24, fontSize: 11, color: '#8E8E93', textAlign: 'center', maxWidth: 260 }}>
        Data syncs securely across all your devices via Supabase.
      </p>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={iconBox}>
        <svg width="36" height="36" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect x="-152" y="-92" width="304" height="184" rx="24" fill="none" stroke="#FFFFFF" strokeWidth="8" transform="translate(256,256) scale(0.78)" />
          <g transform="translate(256,256) scale(0.78)">
            <line x1="-50.6" y1="-92" x2="-50.6" y2="92" stroke="#FFFFFF" strokeWidth="6" />
            <line x1="50.6" y1="-92" x2="50.6" y2="92" stroke="#FFFFFF" strokeWidth="6" />
            <ellipse cx="-101.3" cy="0" rx="32" ry="40" fill="#FFFFFF" />
            <ellipse cx="0" cy="0" rx="32" ry="40" fill="#FF9F0A" />
            <ellipse cx="101.3" cy="0" rx="32" ry="40" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
      <h1 style={logoTitle}>ROKDIV</h1>
    </div>
  )
}

const containerStyle = {
  minHeight: '100vh',
  background: '#F2F2F7',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '24px 20px',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
}
const iconBox = {
  width: 88, height: 88, borderRadius: '20px',
  background: '#0D0D0D',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const logoTitle = {
  fontSize: '22px', fontWeight: 500, color: '#1C1C1E',
  letterSpacing: '-0.02em', margin: 0,
}
const logoSub = {
  fontSize: '13px', color: '#8E8E93', marginTop: '14px', marginBottom: '32px',
  textAlign: 'center', fontWeight: 500,
}
const cardStyle = {
  width: '100%', maxWidth: 360,
  background: '#FFFFFF', borderRadius: '20px',
  border: '1.5px solid #D1D1D6',
  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  padding: '28px 24px',
}
const cardHeading = {
  fontSize: '16px', fontWeight: 500, color: '#1C1C1E', marginBottom: '6px', marginTop: 0,
}
const cardSubheading = {
  fontSize: '12px', color: '#8E8E93', marginBottom: '20px', marginTop: 0,
}
const fieldLabel = {
  display: 'block', fontSize: '12px', color: '#8E8E93', marginBottom: '4px', fontWeight: 500,
}
const fieldInput = {
  width: '100%', padding: '11px 12px', borderRadius: '10px',
  border: '1.5px solid #D1D1D6', fontSize: '16px', color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}
const eyeBtn = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', display: 'flex', padding: 0,
}
const errorBox = {
  background: TINT.red, border: 'none',
  borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: SIGNAL.red, fontWeight: 500,
}
const primaryBtn = {
  width: '100%', marginTop: '4px', padding: '13px', borderRadius: '12px',
  background: '#0D0D0D', color: '#FFFFFF', border: 'none',
  fontSize: '14px', fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
}