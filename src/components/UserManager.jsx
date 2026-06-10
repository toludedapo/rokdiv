import React, { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Users, Mail, ShieldCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

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
    if (!/^[^\S@]+@[^\S@]+\.[^\S@]+$/.test(email.trim()) === false) {
      // basic email check
    }
    setSending(true)
    try {
      // FIX: Only use signInWithOtp — admin.inviteUserByEmail requires service role key
      // which is not available in the browser. signInWithOtp creates the user and
      // sends a magic link they can use to log in.
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

  const card = {
    background:'#FFFFFF', borderRadius:16,
    boxShadow:'0 2px 12px rgba(0,0,0,0.07)',
    border:'1.5px solid #F3F4F6', overflow:'hidden',
  }

  return (
    <div className="mx-4" style={{ display:'flex', flexDirection:'column', gap:12 }}>

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#EEF1FF', borderRadius:12, border:'1px solid #C7D2FE' }}>
        <ShieldCheck size={15} style={{ color:'#4F6EF7' }} />
        <span style={{ fontSize:12, fontWeight:700, color:'#4F6EF7' }}>Admin Panel</span>
        <span style={{ fontSize:11, color:'#6B7280', marginLeft:4 }}>Only visible to {adminEmail}</span>
      </div>

      <div style={{ ...card, padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#EEF1FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <UserPlus size={14} style={{ color:'#4F6EF7' }} />
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}>Invite New User</span>
        </div>

        <label className="label">Email address</label>
        <div style={{ display:'flex', gap:8 }}>
          <input type="email" className="field" placeholder="worker@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            style={{ fontSize:16, flex:1 }}
          />
          <button onClick={handleInvite} disabled={sending} style={{
            background:'linear-gradient(135deg, #4F6EF7, #3B55E0)',
            color:'#fff', border:'none', borderRadius:12,
            padding:'0 18px', fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6,
            opacity: sending ? 0.6 : 1, whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(79,110,247,0.3)',
          }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>

        {error   && <div style={{ marginTop:10, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'9px 13px', fontSize:12, color:'#DC2626' }}>{error}</div>}
        {success && <div style={{ marginTop:10, background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, padding:'9px 13px', fontSize:12, color:'#059669', fontWeight:600 }}>✓ {success}</div>}

        <p style={{ fontSize:11, color:'#9CA3AF', marginTop:10 }}>
          The user receives a magic link by email. One tap and they are logged in — no password needed initially. They can set a password once inside the app.
        </p>
      </div>

      <div style={card}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={14} style={{ color:'#6B7280' }} />
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}>
              App Users <span style={{ color:'#9CA3AF', fontWeight:400 }}>({users.length})</span>
            </span>
          </div>
          <button onClick={fetchUsers} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding:32, display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#9CA3AF', fontSize:13 }}>
            <Loader2 size={14} className="animate-spin" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding:32, textAlign:'center' }}>
            <Users size={28} style={{ margin:'0 auto 10px', color:'#E5E7EB' }} />
            <p style={{ fontSize:13, color:'#9CA3AF' }}>No users invited yet</p>
          </div>
        ) : (
          users.map((u, idx) => (
            <div key={u.id} style={{ padding:'13px 18px', borderBottom: idx < users.length-1 ? '1px solid #F3F4F6' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                <div style={{ width:34, height:34, borderRadius:99, background: u.email === adminEmail ? 'linear-gradient(135deg,#4F6EF7,#3B55E0)' : '#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color: u.email === adminEmail ? '#fff' : '#6B7280' }}>
                    {u.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {u.email}
                    {u.email === adminEmail && (
                      <span style={{ marginLeft:6, fontSize:10, background:'#EEF1FF', color:'#4F6EF7', borderRadius:99, padding:'1px 7px', fontWeight:700 }}>Admin</span>
                    )}
                  </p>
                  <p style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>
                    {u.status === 'invited' ? '📨 Invite sent' : '✅ Active'} · {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {u.email !== adminEmail && (
                <button onClick={() => handleDelete(u.id, u.email)} disabled={deleting === u.id}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#D1D5DB', padding:6, flexShrink:0 }}>
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
