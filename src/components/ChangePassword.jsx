import { useState } from 'react'
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ChangePassword({ onClose }) {
  const [newPass,    setNewPass]    = useState('')
  const [confirmPass,setConfirmPass]= useState('')
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPass.length < 6)         return setError('Password must be at least 6 characters.')
    if (newPass !== confirmPass)     return setError('Passwords do not match.')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      setDone(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 70,
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#E5E7EB' }} />
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={40} style={{ color: '#10B981', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#111827', fontSize: 16, margin: '0 0 6px' }}>
              Password updated!
            </p>
            <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
              Use this password next time you log in.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF1FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={16} style={{ color: '#4F6EF7' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111827' }}>Set a Password</p>
                <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>You can log in with this next time</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password" autoComplete="new-password" required
                  value={newPass} onChange={e => setNewPass(e.target.value)}
                  className="field" placeholder="Min. 6 characters"
                  style={{ fontSize: 16 }} autoFocus
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password" autoComplete="new-password" required
                  value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  className="field" placeholder="Type it again"
                  style={{ fontSize: 16 }}
                />
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={saving} className="btn-primary" style={{ marginTop: 4 }}>
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                  : 'Set Password'
                }
              </button>

              <button type="button" onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#9CA3AF',
                  fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}
