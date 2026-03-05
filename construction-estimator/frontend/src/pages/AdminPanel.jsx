import { useEffect, useState } from 'react'
import { getMaterials, getCategories, updateMaterial, createMaterial, deleteMaterial, updatePrice } from '../utils/api'
import { Settings, Plus, Pencil, Trash2, X, Check, RefreshCw, ShieldAlert } from 'lucide-react'

function EditRow({ material, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...material })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <tr className="bg-navy/30">
      <td className="px-3 py-2">
        <input className="input text-xs py-1" value={form.name} onChange={e => set('name', e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <select className="input text-xs py-1" value={form.category} onChange={e => set('category', e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs py-1 w-20" value={form.size || ''} onChange={e => set('size', e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <select className="input text-xs py-1 w-20" value={form.unit || 'pcs'} onChange={e => set('unit', e.target.value)}>
          {['pcs','length','set','unit','day','kg','bag'].map(u => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs py-1 w-24" type="number" min="0" value={form.price}
          onChange={e => set('price', parseFloat(e.target.value) || 0)} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs py-1" value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} />
      </td>
      <td className="px-3 py-2 text-center space-x-1">
        <button onClick={() => onSave(form)} className="text-green-400 hover:text-green-300 p-1">
          <Check size={14} />
        </button>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 p-1">
          <X size={14} />
        </button>
      </td>
    </tr>
  )
}

function BulkPriceUpdate({ materials, categories, onDone }) {
  const [cat, setCat]     = useState('')
  const [pct, setPct]     = useState(0)
  const [applying, setApplying] = useState(false)
  const [count, setCount] = useState(0)

  const apply = async () => {
    if (!pct) return
    setApplying(true)
    const targets = cat ? materials.filter(m => m.category === cat) : materials
    await Promise.all(targets.map(m => updatePrice(m.id, m.price * (1 + pct / 100))))
    setCount(targets.length)
    setApplying(false)
    setTimeout(() => { setCount(0); onDone() }, 2000)
  }

  return (
    <div className="card border border-yellow-500/20 space-y-3">
      <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
        <ShieldAlert size={16} /> Bulk Price Adjustment
      </h3>
      <p className="text-xs text-gray-400">
        Apply a percentage increase or decrease to all materials in a category.
      </p>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">Category (blank = all)</label>
          <select className="input" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="label">% Change</label>
          <input className="input" type="number" step="0.5" value={pct}
            onChange={e => setPct(parseFloat(e.target.value) || 0)}
            placeholder="+5 or -3" />
        </div>
        <button className="btn-accent flex items-center gap-1.5" onClick={apply} disabled={applying}>
          {applying ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {count > 0 && (
        <p className="text-green-400 text-xs">✓ Updated {count} materials.</p>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [materials, setMaterials]   = useState([])
  const [categories, setCategories] = useState([])
  const [editId, setEditId]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [newMat, setNewMat]         = useState({
    name: '', category: 'Supply Pipe', size: '', unit: 'pcs', price: 0, supplier: 'Standard',
  })

  const load = async () => {
    setLoading(true)
    const [mats, cats] = await Promise.all([getMaterials({}), getCategories()])
    setMaterials(mats.data)
    setCategories(cats.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    await updateMaterial(form.id, {
      name: form.name, category: form.category, size: form.size,
      unit: form.unit, price: form.price, supplier: form.supplier,
    })
    setEditId(null)
    load()
  }

  const handleAdd = async () => {
    if (!newMat.name) return
    await createMaterial(newMat)
    setShowAdd(false)
    setNewMat({ name: '', category: 'Supply Pipe', size: '', unit: 'pcs', price: 0, supplier: 'Standard' })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this material?')) return
    await deleteMaterial(id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={22} /> Admin Panel
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage materials, prices, categories, and suppliers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="btn-accent flex items-center gap-2">
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      {/* Bulk price update */}
      <BulkPriceUpdate materials={materials} categories={categories} onDone={load} />

      {/* Add row */}
      {showAdd && (
        <div className="card border border-navy-light/30 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">New Material</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={newMat.name}
                onChange={e => setNewMat(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={newMat.category}
                onChange={e => setNewMat(f => ({ ...f, category: e.target.value }))}>
                {[...categories, 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Size</label>
              <input className="input" value={newMat.size}
                onChange={e => setNewMat(f => ({ ...f, size: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={newMat.unit}
                onChange={e => setNewMat(f => ({ ...f, unit: e.target.value }))}>
                {['pcs','length','set','unit','day','kg','bag'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (₱)</label>
              <input className="input" type="number" value={newMat.price}
                onChange={e => setNewMat(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input className="input" value={newMat.supplier}
                onChange={e => setNewMat(f => ({ ...f, supplier: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary">Save Material</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Materials table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            All Materials ({materials.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                <th className="text-left px-3 py-2.5">Name</th>
                <th className="text-left px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">Price (₱)</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500">Loading…</td></tr>
              ) : materials.map(m => (
                editId === m.id ? (
                  <EditRow key={m.id} material={m} categories={categories}
                    onSave={handleSave} onCancel={() => setEditId(null)} />
                ) : (
                  <tr key={m.id} className="table-row group">
                    <td className="px-3 py-2 font-medium text-white">{m.name}</td>
                    <td className="px-3 py-2 text-gray-400">{m.category}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{m.size || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{m.unit || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-white">
                      ₱{m.price.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{m.supplier || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditId(m.id)}
                          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(m.id)}
                          className="p-1 text-gray-400 hover:text-accent hover:bg-accent/10 rounded">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Price reference: TheProjectEstimate.com · All prices in Philippine Peso (₱)
      </p>
    </div>
  )
}
