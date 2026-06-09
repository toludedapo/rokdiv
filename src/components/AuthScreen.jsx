import React, { useState } from 'react'
import { Egg, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [info,    setInfo]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim() || !pass.trim()) return setError('Email and password are required.')
    if (pass.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), pass)
        if (error) setError(error.message)
      } else {
        const { error } = await signUp(email.trim(), pass)
        if (error) setError(error.message)
        else setInfo('Account created! Check your email to confirm, then log in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-farm-ivory flex flex-col items-center justify-center px-5"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-farm-green rounded-2xl flex items-center justify-center mb-3 shadow-md">
          <Egg size={32} className="text-farm-amber-mid" />
        </div>
        <h1 className="text-2xl font-semibold text-farm-green tracking-tight">ROKDIV</h1>
        <p className="text-sm text-gray-400 mt-0.5">Egg Sales Tracker</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          {mode === 'login' ? 'Sign in to your farm' : 'Create your account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all"
              placeholder="you@email.com"
              style={{ fontSize: 16 }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required
                value={pass} onChange={e => setPass(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all"
                placeholder="Min. 6 characters"
                style={{ fontSize: 16 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {info  && <p className="text-xs text-farm-green bg-farm-green-light rounded-lg px-3 py-2">{info}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-farm-green text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login'
                ? <><LogIn size={15} /> Sign In</>
                : <><UserPlus size={15} /> Create Account</>
            }
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
            className="text-farm-green font-medium underline underline-offset-2">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <p className="mt-6 text-[11px] text-gray-400 text-center max-w-xs">
        Your data is securely stored in the cloud and syncs across all your devices.
      </p>
    </div>
  )
}
