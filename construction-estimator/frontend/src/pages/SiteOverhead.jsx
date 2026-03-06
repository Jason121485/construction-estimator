import { useEffect, useState, useCallback } from 'react'
import {
  getProjects, getOverhead, addOverheadItem, updateOverheadItem,
  deleteOverheadItem, seedOverhead, getOverheadSummary,
} from '../utils/api'
import { Plus, Trash2, X, Layers, RefreshCw } from 'lucide-react'

const CATEGORIES = [
  'Supervision', 'Temporary Facilities', 'Temporary Utilities',
  'Safety Program', 'Security', 'Equipment Rental',
  'Site Logistics', 'Permits & Fees', 'Insurance & Bonds', 'Miscellaneous',
]

const fmt = (n) => (n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function AddItemModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    category: 'Supervision', description: '', unit: 'month', quantity: 0, unit_cost: 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg border border-white/10 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Add Overhead Item</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description *</label>
            <input className="input" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Safety Officer" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit} onChange={e => set('unit', e.target.value)} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="0" step="1" value={form.quantity}
                onChange={e => set('quantity', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Unit Cost (₱)</label>
              <input className="input" type="number" min="0" step="100" value={form.unit_cost}
                onChange={e => set('unit_cost', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-accent">₱{fmt(form.quantity * form.unit_cost)}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1"
              onClick={() => { if (form.description) onSave(form) }}>Add Item</button>
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InlineRow({ item, onUpdate, onDelete }) {
  const [qty, setQty]  = useState(item.quantity)
  const [cost, setCost] = useState(item.unit_cost)
  const [dirty, setDirty] = useState(false)

  const save = async () => {
    await onUpdate(item.id, { quantity: qty, unit_cost: cost })
    setDirty(false)
  }

  return (
    <tr className="table-row group">
      <td className="px-4 py-2 text-white text-sm">{item.description}</td>
      <td className="px-3 py-2 text-gray-500 text-xs text-center">{item.unit || '—'}</td>
      <td className="px-2 py-1.5">
        <input
          className="input text-center text-xs py-1 px-2 w-20"
          type="number" min="0" step="1" value={qty}
          onChange={e => { setQty(parseFloat(e.target.value) || 0); setDirty(true) }}
          onBlur={() => dirty && save()}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className="input text-right text-xs py-1 px-2 w-28"
          type="number" min="0" step="100" value={cost}
          onChange={e => { setCost(parseFloat(e.target.value) || 0); setDirty(true) }}
          onBlur={() => dirty && save()}
        />
      </td>
      <td className="px-4 py-2 text-right font-semibold text-accent text-sm">
        ₱{fmt(qty * cost)}
      </td>
      <td className="px-2 py-2">
        <button onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-accent transition-opacity">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

export default function SiteOverhead() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [items, setItems]           = useState([])
  const [summary, setSummary]       = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [seeding, setSeeding]       = useState(false)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  const load = useCallback(async (pid) => {
    if (!pid) return
    setLoading(true)
    const [it, sm] = await Promise.all([getOverhead(pid), getOverheadSummary(pid)])
    setItems(it.data)
    setSummary(sm.data)
    setLoading(false)
  }, [])

  useEffect(() => { load(selProject) }, [selProject, load])

  const handleSeed = async () => {
    setSeeding(true)
    await seedOverhead(selProject)
    await load(selProject)
    setSeeding(false)
  }

  const handleAdd = async (form) => {
    await addOverheadItem(selProject, form)
    setShowAdd(false)
    load(selProject)
  }

  const handleUpdate = async (id, data) => {
    await updateOverheadItem(selProject, id, data)
    load(selProject)
  }

  const handleDelete = async (id) => {
    await deleteOverheadItem(selProject, id)
    load(selProject)
  }

  // Group by category
  const byCategory = items.reduce((acc, item) => {
    const cat = item.category || 'Miscellaneous'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Overhead</h1>
        <p className="text-sm text-gray-400 mt-1">General expenses — supervision, facilities, safety, permits</p>
      </div>

      {/* Project selector + actions */}
      <div className="card flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="label">Select Project</label>
          <select className="input" value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">Choose a project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        {selProject && (
          <>
            <button className="btn-ghost flex items-center gap-2 text-sm" onClick={handleSeed} disabled={seeding}>
              <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Populating…' : 'Populate Defaults'}
            </button>
            <button className="btn-accent flex items-center gap-2" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Item
            </button>
          </>
        )}
      </div>

      {!selProject ? (
        <div className="card text-center py-16">
          <Layers size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a project to manage site overhead costs</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : (
        <>
          {/* Summary bar */}
          {summary && (
            <div className="card flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-400">Total Site Overhead</p>
                <p className="text-2xl font-bold text-accent">₱{fmt(summary.grand_total_overhead)}</p>
              </div>
              <div className="flex gap-6 flex-wrap">
                {Object.entries(summary.by_category || {}).map(([cat, total]) => (
                  <div key={cat} className="text-center">
                    <p className="text-xs text-gray-500">{cat}</p>
                    <p className="text-sm font-semibold text-white">₱{fmt(total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items grouped by category */}
          {Object.keys(byCategory).length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 text-sm">
                No overhead items yet.{' '}
                <button className="text-accent underline" onClick={handleSeed}>Populate defaults</button>
                {' '}or add items manually.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {CATEGORIES.filter(c => byCategory[c]).map(cat => (
                <div key={cat} className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{cat}</h3>
                    <span className="text-xs font-medium text-accent">
                      ₱{fmt(byCategory[cat].reduce((s, i) => s + i.total_cost, 0))}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="table-head">
                        <th className="text-left px-4 py-2">Description</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Cost (₱)</th>
                        <th className="px-4 py-2 text-right">Total (₱)</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory[cat].map(item => (
                        <InlineRow
                          key={item.id}
                          item={item}
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {/* Uncategorized */}
              {byCategory['Other'] && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white">Other</h3>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="table-head">
                        <th className="text-left px-4 py-2">Description</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Cost (₱)</th>
                        <th className="px-4 py-2 text-right">Total (₱)</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory['Other'].map(item => (
                        <InlineRow key={item.id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddItemModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
