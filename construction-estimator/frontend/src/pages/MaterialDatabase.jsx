import { useEffect, useState, useCallback } from 'react'
import { getMaterials, getCategories, updatePrice, createMaterial, deleteMaterial } from '../utils/api'
import { Search, Plus, Pencil, Trash2, X, Check, RefreshCw } from 'lucide-react'

const CAT_COLORS = {
  'Supply Pipe':   'bg-blue-500/20 text-blue-300',
  'Drainage Pipe': 'bg-purple-500/20 text-purple-300',
  'Fitting':       'bg-yellow-500/20 text-yellow-300',
  'Valve':         'bg-green-500/20 text-green-300',
  'Fixture':       'bg-pink-500/20 text-pink-300',
  'Equipment':     'bg-orange-500/20 text-orange-300',
  'Labor':         'bg-gray-500/20 text-gray-300',
}

function PriceEditor({ material, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(material.price)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(material.id, parseFloat(val))
    setSaving(false)
    setEditing(false)
  }

  if (editing) return (
    <div className="flex items-center gap-1">
      <span className="text-gray-400 text-xs">₱</span>
      <input type="number" min="0" step="10"
        className="bg-white/10 border border-navy-light rounded px-1 py-0.5 w-20 text-xs text-white"
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        autoFocus
      />
      <button onClick={save} disabled={saving}
        className="text-green-400 hover:text-green-300 p-0.5">
        <Check size={13} />
      </button>
      <button onClick={() => { setEditing(false); setVal(material.price) }}
        className="text-gray-500 hover:text-gray-300 p-0.5">
        <X size={13} />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-2 group/price">
      <span className="font-medium text-white">₱{material.price.toLocaleString()}</span>
      <button onClick={() => setEditing(true)}
        className="opacity-0 group-hover/price:opacity-100 text-gray-500 hover:text-white transition-opacity">
        <Pencil size={12} />
      </button>
    </div>
  )
}

function AddMaterialModal({ categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', category: categories[0] || 'Supply Pipe',
    size: '', unit: 'pcs', price: 0, supplier: 'Standard',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg border border-white/10 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Add Material</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Material Name *</label>
            <input className="input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="e.g. PPR Pipe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={e => set('category', e.target.value)}>
                {[...categories, 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Size</label>
              <input className="input" value={form.size}
                onChange={e => set('size', e.target.value)} placeholder="e.g. 25mm" />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit}
                onChange={e => set('unit', e.target.value)}>
                {['pcs', 'length', 'set', 'unit', 'day', 'kg', 'bag'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (₱)</label>
              <input className="input" type="number" min="0" step="10" value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="label">Supplier</label>
            <input className="input" value={form.supplier}
              onChange={e => set('supplier', e.target.value)} placeholder="Standard" />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1"
              onClick={() => { if (form.name) onSave(form) }}>
              Add Material
            </button>
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MaterialDatabase() {
  const [materials, setMaterials]   = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch]         = useState('')
  const [activecat, setActivecat]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [mats, cats] = await Promise.all([
      getMaterials({ category: activecat || undefined, search: search || undefined }),
      getCategories(),
    ])
    setMaterials(mats.data)
    setCategories(cats.data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [activecat, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handlePriceSave = async (id, price) => {
    await updatePrice(id, price)
    load()
  }

  const handleAdd = async (form) => {
    await createMaterial(form)
    setShowAdd(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this material from the database?')) return
    await deleteMaterial(id)
    load()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Material Price Database</h1>
          <p className="text-sm text-gray-400 mt-1">
            {materials.length} items · Reference: TheProjectEstimate.com
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-accent flex items-center gap-2">
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9" placeholder="Search materials…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActivecat('')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${!activecat ? 'bg-navy text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            All
          </button>
          {categories.map(c => (
            <button key={c}
              onClick={() => setActivecat(c === activecat ? '' : c)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activecat === c ? 'bg-navy text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="text-left px-4 py-3">Material Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Price (₱)</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : materials.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No materials found</td></tr>
              ) : materials.map(m => (
                <tr key={m.id} className="table-row group">
                  <td className="px-4 py-2.5 font-medium text-white">{m.name}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`badge ${CAT_COLORS[m.category] || 'bg-gray-500/20 text-gray-300'}`}>
                      {m.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-300">{m.size || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">{m.unit || '—'}</td>
                  <td className="px-4 py-2.5">
                    <PriceEditor material={m} onSave={handlePriceSave} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{m.supplier || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {m.last_updated ? new Date(m.last_updated).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-accent transition-all">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price update note */}
      <p className="text-xs text-gray-600">
        💡 Hover over any price and click the pencil icon to update it immediately.
        Prices are in Philippine Peso (₱) and referenced from TheProjectEstimate.com.
      </p>

      {showAdd && (
        <AddMaterialModal categories={categories} onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
