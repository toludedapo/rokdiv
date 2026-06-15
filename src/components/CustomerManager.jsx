import { useState, useMemo } from 'react'
import { Plus, Loader2, Pencil, Trash2, X, Check } from 'lucide-react'

function normalizeWhatsApp(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1)
  if (digits.length === 10) return '234' + digits
  return digits
}

function buildWaLink(number, message = '') {
  const normalized = normalizeWhatsApp(number)
  if (!normalized) return null
  return `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

export default function CustomerManager({ customers, onAdd, onUpdate, onDelete, isAdmin }) {
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
      <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Customers</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#4F6EF7' }}>{customers.length}</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ name: '', whatsapp: '', notes: '' }) }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', background: '#4F6EF7', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Add Customer'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1.5px solid #4F6EF7' }}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>New Customer</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lblStyle}>Name *</label>
              <input type="text" placeholder="e.g. Mama Tunde" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={inpStyle} autoFocus />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lblStyle}>WhatsApp Number</label>
              <input type="tel" placeholder="e.g. 08012345678" value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                style={inpStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lblStyle}>Notes (optional)</label>
              <input type="text" placeholder="e.g. Pays end of month, prefers transfer" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={inpStyle} />
            </div>
          </div>
          {error && <p style={{ color: '#EF4444', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
          <button onClick={handleSubmit} disabled={saving}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', background: '#4F6EF7', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save Customer
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#9CA3AF' }}>🔍</span>
        <input type="text" placeholder="Search customers..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inpStyle, paddingLeft: '34px' }} />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px' }}>×</button>
        )}
      </div>

      {/* Customer list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px' }}>
          {customers.length === 0 ? 'No customers yet. Add your first customer above.' : 'No customers match your search.'}
        </div>
      )}

      {filtered.map(c => (
        <div key={c.id} style={{ background: 'white', borderRadius: '14px', marginBottom: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {editId === c.id ? (
            // Edit form inline
            <div style={{ padding: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lblStyle}>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inpStyle} autoFocus />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lblStyle}>WhatsApp</label>
                  <input type="tel" placeholder="08012345678" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} style={inpStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lblStyle}>Notes</label>
                  <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inpStyle} />
                </div>
              </div>
              {error && <p style={{ color: '#EF4444', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#4F6EF7', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                </button>
                <button onClick={cancelEdit}
                  style={{ padding: '9px 16px', borderRadius: '8px', background: '#F3F4F6', color: '#6B7280', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 700, color: '#111827' }}>{c.name}</p>
                  {c.whatsapp && (
                    <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6B7280' }}>
                      📱 {c.whatsapp.startsWith('234') ? '0' + c.whatsapp.slice(3) : c.whatsapp}
                    </p>
                  )}
                  {c.notes && (
                    <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>{c.notes}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                  {c.whatsapp && (
                    <a href={buildWaLink(c.whatsapp)} target="_blank" rel="noreferrer"
                      style={{ padding: '6px 10px', borderRadius: '8px', background: '#ECFDF5', color: '#059669', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Chat
                    </a>
                  )}
                  <button onClick={() => startEdit(c)}
                    style={{ padding: '6px 10px', borderRadius: '8px', background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                    <Pencil size={11} /> Edit
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      style={{ padding: '6px 10px', borderRadius: '8px', background: '#FEE2E2', color: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {deleting === c.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const lblStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
}
const inpStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: '#FAFAFA',
  fontFamily: 'inherit'
}
