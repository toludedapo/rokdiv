import { useState, useMemo } from 'react'
import { Plus, Loader2, Pencil, Trash2, X, Check, Search } from 'lucide-react'
import { normalizeWhatsApp, buildWaLink } from '../lib/calculations'

const SIGNAL = { green: '#34C759', red: '#FF453A', orange: '#FF9F0A', gray: '#8E8E93' }

export default function CustomerManager({ customers = [], onAdd, onUpdate, onDelete, isAdmin }) {
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ name: '', whatsapp: '', notes: '' })
  const [error, setError]       = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.whatsapp || '').includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    )
  }, [customers, search])

  function startEdit(c) {
    setEditId(c.id)
    setForm({ name: c.name, whatsapp: c.whatsapp || '', notes: c.notes || '' })
    setShowForm(false)
  }

  function cancelEdit() {
    setEditId(null)
    setForm({ name: '', whatsapp: '', notes: '' })
    setError('')
  }

  async function handleSubmit() {
    if (!form.name.trim()) return setError('Name is required')
    setSaving(true); setError('')
    if (editId) {
      const { error: err } = await onUpdate(editId, {
        name: form.name.trim(),
        whatsapp: normalizeWhatsApp(form.whatsapp) || null,
        notes: form.notes.trim() || null
      })
      if (err) setError('Failed to update')
      else cancelEdit()
    } else {
      const { error: err } = await onAdd({
        name: form.name.trim(),
        whatsapp: normalizeWhatsApp(form.whatsapp),
        notes: form.notes.trim()
      })
      if (err) setError('Failed to save')
      else { setForm({ name: '', whatsapp: '', notes: '' }); setShowForm(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
  }

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* Header stats */}
      <div style={{ ...cardSurface, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={label}>Total customers</p>
          <p style={{ ...statValue, fontSize: 28 }}>{customers.length}</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ name: '', whatsapp: '', notes: '' }) }}
          style={showForm ? secondaryBtnSmall : primaryBtnSmall}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Add customer'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...cardSurface, marginBottom: 12 }}>
          <p style={{ ...label, marginBottom: 12 }}>New customer</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fieldLabel}>Name *</label>
              <input type="text" placeholder="e.g. Mama Tunde" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={fieldInput} autoFocus />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fieldLabel}>WhatsApp number</label>
              <input type="tel" placeholder="e.g. 08012345678" value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                style={fieldInput} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fieldLabel}>Notes (optional)</label>
              <input type="text" placeholder="e.g. Pays end of month, prefers transfer" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={fieldInput} />
            </div>
          </div>
          {error && <p style={{ color: SIGNAL.red, fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save customer
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }} />
        <input type="text" placeholder="Search customers" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...fieldInput, paddingLeft: '34px' }} />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', fontSize: '16px' }}>×</button>
        )}
      </div>

      {/* Customer list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8E8E93', fontSize: '13px' }}>
          {customers.length === 0 ? 'No customers yet. Add your first customer above.' : 'No customers match your search.'}
        </div>
      )}

      {filtered.map(c => (
        <div key={c.id} style={{ ...cardSurface, marginBottom: '10px' }}>
          {editId === c.id ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={fieldLabel}>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldInput} autoFocus />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={fieldLabel}>WhatsApp</label>
                  <input type="tel" placeholder="08012345678" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} style={fieldInput} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={fieldLabel}>Notes</label>
                  <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={fieldInput} />
                </div>
              </div>
              {error && <p style={{ color: SIGNAL.red, fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnSmall, flex: 1, justifyContent: 'center' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                </button>
                <button onClick={cancelEdit} style={secondaryBtnSmall}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 500, color: '#1C1C1E' }}>{c.name}</p>
                {c.whatsapp && (
                  <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#8E8E93' }}>
                    {c.whatsapp.startsWith('234') ? '0' + c.whatsapp.slice(3) : c.whatsapp}
                  </p>
                )}
                {c.notes && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#C7C7CC' }}>{c.notes}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                {c.whatsapp && (
                  <a href={buildWaLink(c.whatsapp)} target="_blank" rel="noreferrer" style={chatLink}>
                    Chat
                  </a>
                )}
                <button onClick={() => startEdit(c)} style={editBtn}>
                  <Pencil size={11} /> Edit
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} style={deleteBtn}>
                    {deleting === c.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const cardSurface = {
  background: '#FFFFFF', borderRadius: 16, padding: 16,
  border: '1.5px solid #D1D1D6', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
}
const label = { margin: 0, fontSize: 12, fontWeight: 500, color: '#8E8E93' }
const statValue = { margin: 0, fontWeight: 500, color: '#1C1C1E', letterSpacing: '-0.02em' }
const fieldLabel = { display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 4 }
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #D1D1D6', fontSize: '14px', color: '#1C1C1E',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF', fontFamily: 'inherit'
}
const primaryBtn = {
  width: '100%', padding: '13px', borderRadius: 12, background: '#0D0D0D', color: '#FFFFFF',
  border: 'none', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
}
const primaryBtnSmall = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px',
  background: '#0D0D0D', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
}
const secondaryBtnSmall = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px',
  background: '#F2F2F7', color: '#8E8E93', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
}
const chatLink = {
  padding: '6px 10px', borderRadius: '8px', background: 'rgba(52,199,89,0.12)', color: SIGNAL.green,
  fontSize: '12px', fontWeight: 500, textDecoration: 'none',
}
const editBtn = {
  padding: '6px 10px', borderRadius: '8px', background: '#F2F2F7', color: '#8E8E93', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500,
}
const deleteBtn = {
  padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,69,58,0.1)', color: SIGNAL.red, border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500,
}
