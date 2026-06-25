import React, { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Users, Mail, ShieldCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', blue: '#0A84FF', gray: '#8E8E93' }
const TINT = { green: 'rgba(52,199,89,0.12)', red: 'rgba(255,69,58,0.12)', blue: 'rgba(10,132,255,0.12)' }

export default function UserManager({ adminEmail }) {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [email,    setEmail]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (e) {
      setError('Could not load users: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleInvite() {
    setError(''); setSuccess('')
    if (!email.trim()) return setError('Enter an email address.')
    setSending(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true }
      })
      if (otpError) throw otpError

      await supabase.from('app_users').upsert({
        email: email.trim(),
        invited_by: adminEmail,
        status: 'invited',
      }, { onConflict: 'email' })

      setSuccess(`Magic link sent to ${email.trim()} — they can log in from their email.`)
      setEmail('')
      fetchUsers()
    } catch (e) {
      setError('Failed to send invite: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(userId, userEmail) {
    if (!window.confirm(`Remove ${userEmail} from the app?`)) return
    setDeleting(userId)
    try {
      await supabase.from('app_users').delete().eq('id', userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setSuccess(`${userEmail} removed`)
    } catch (e) {
      setError('Could not remove user: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background: TINT.blue, borderRadius:12 }}>
        <ShieldCheck size={15} style={{ color: SIGNAL.blue }} />
        <span style={{ fontSize:12, fontWeight:500, color: SIGNAL.blue }}>Admin panel</span>
        <span style={{ fontSize:12, color:'#8E8E93', marginLeft:4 }}>Only visible to {adminEmail}</span>
      </div>

      <div style={cardSurface}>
        <p style={{ ...label, marginBottom: 14 }}>Invite new user</p>

        <label style={fieldLabel}>Email address</label>
        <div style={{ display:'flex', gap:8 }}>
          <input type="email" style={{ ...fieldInput, flex: 1 }} placeholder="worker@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <button onClick={handleInvite} disabled={sending} style={primaryBtn}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>

        {error   && <div style={{ marginTop:10, background: TINT.red, borderRadius:10, padding:'9px 13px', fontSize:12, color: SIGNAL.red }}>{error}</div>}
        {success && <div style={{ marginTop:10, background: TINT.green, borderRadius:10, padding:'9px 13px', fontSize:12, color: SIGNAL.green, fontWeight:500 }}>{success}</div>}

        <p style={{ fontSize:12, color:'#8E8E93', marginTop:10 }}>
          The user receives a magic link by email. One tap and they're logged in — no password needed initially. They can set a password once inside the app.
        </p>
      </div>

      <div style={cardSurface}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
          <p style={{ ...label, margin: 0 }}>
            App users <span style={{ color:'#C7C7CC' }}>({users.length})</span>
          </p>
          <button onClick={fetchUsers} style={refreshBtn}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding:24, display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#8E8E93', fontSize:13 }}>
            <Loader2 size={14} className="animate-spin" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding:24, textAlign:'center' }}>
            <Users size={28} style={{ margin:'0 auto 10px', color:'#E5E5EA' }} />
            <p style={{ fontSize:13, color:'#8E8E93' }}>No users invited yet</p>
          </div>
        ) : (
          users.map((u, idx) => (
            <div key={u.id} style={{ padding:'13px 0', borderBottom: idx < users.length-1 ? '0.5px solid #E5E5EA' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                <div style={{ width:34, height:34, borderRadius:99, background: u.email === adminEmail ? '#1C1C1E' : '#F2F2F7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:500, color: u.email === adminEmail ? '#FFFFFF' : '#8E8E93' }}>
                    {u.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:14, color:'#1C1C1E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin: 0 }}>
                    {u.email}
                    {u.email === adminEmail && (
                      <span style={{ marginLeft:6, fontSize:11, background: TINT.blue, color: SIGNAL.blue, borderRadius:99, padding:'1px 7px', fontWeight:500 }}>Admin</span>
                    )}
                  </p>
                  <p style={{ fontSize:12, color:'#8E8E93', marginTop:1 }}>
                    {u.status === 'invited' ? 'Invite sent' : 'Active'} · {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {u.email !== adminEmail && (
                <button onClick={() => handleDelete(u.id, u.email)} disabled={deleting === u.id}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#C7C7CC', padding:6, flexShrink:0 }}>
                  {deleting === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
}
const label = { margin: 0, fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const fieldLabel = { display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 6 }
const fieldInput = {
  padding: '10px 12px', borderRadius: 10, border: '1.5px solid #D1D1D6',
  fontSize: '14px', color: '#1C1C1E', outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}
const primaryBtn = {
  background: '#0D0D0D', color: '#FFFFFF', border: 'none', borderRadius: 10,
  padding: '0 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
}
const refreshBtn = {
  background:'none', border:'none', cursor:'pointer', color:'#8E8E93',
  display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500,
}