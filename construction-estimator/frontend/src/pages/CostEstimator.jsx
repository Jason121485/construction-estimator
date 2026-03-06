import { useEffect, useState } from 'react'
import { getProjects, getEstimate, getEstimateSummary, addEstimateItem, deleteEstimateItem, getMaterials } from '../utils/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Plus, Trash2, X, Calculator } from 'lucide-react'

const COLORS = ['#0f3460','#e94560','#16213e','#1a4a80','#c23351','#0d7377','#2b2d42']

const CSI_DIVISIONS = [
  'Division 01 - General Requirements',
  'Division 02 - Site Work & Demolition',
  'Division 03 - Concrete',
  'Division 04 - Masonry',
  'Division 05 - Metals / Structural Steel',
  'Division 06 - Carpentry & Wood',
  'Division 07 - Thermal & Moisture Protection',
  'Division 08 - Doors, Windows & Glazing',
  'Division 09 - Finishes',
  'Division 10 - Specialties',
  'Division 11 - Equipment',
  'Division 12 - Furnishings',
  'Division 13 - Special Construction',
  'Division 14 - Conveying Systems',
  'Division 15 - Mechanical & Plumbing',
  'Division 16 - Electrical',
]

function AddItemModal({ projectId, materials, onSave, onClose }) {
  const [form, setForm] = useState({
    item_name: '', category: 'Supply Pipe', size: '', division: '',
    unit: 'pcs', quantity: 1, unit_price: 0, notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pickMaterial = (m) => {
    set('item_name', m.name)
    set('category', m.category)
    set('size', m.size || '')
    set('unit', m.unit || 'pcs')
    set('unit_price', m.price)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg border border-white/10 w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Add Estimate Item</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Quick pick from DB */}
          <div>
            <label className="label">Quick-pick from Material DB</label>
            <select className="input" onChange={e => {
              const m = materials.find(x => x.id === parseInt(e.target.value))
              if (m) pickMaterial(m)
            }}>
              <option value="">Select a material to autofill…</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.size} — ₱{m.price.toLocaleString()} / {m.unit}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input className="input" value={form.item_name}
                onChange={e => set('item_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category}
                onChange={e => set('category', e.target.value)} />
            </div>
            <div>
              <label className="label">CSI Division</label>
              <select className="input" value={form.division || ''}
                onChange={e => set('division', e.target.value)}>
                <option value="">— None —</option>
                {CSI_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Size</label>
              <input className="input" value={form.size}
                onChange={e => set('size', e.target.value)} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit}
                onChange={e => set('unit', e.target.value)} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="0" step="1" value={form.quantity}
                onChange={e => set('quantity', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Unit Price (₱)</label>
              <input className="input" type="number" min="0" step="10" value={form.unit_price}
                onChange={e => set('unit_price', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="text-right pt-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-accent">
                ₱{(form.quantity * form.unit_price).toLocaleString()}
              </p>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1"
              onClick={() => { if (form.item_name) onSave(form) }}>
              Add Item
            </button>
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CostEstimator() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [items, setItems]           = useState([])
  const [summary, setSummary]       = useState(null)
  const [materials, setMaterials]   = useState([])
  const [showAdd, setShowAdd]       = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    getProjects().then(r => setProjects(r.data))
    getMaterials({}).then(r => setMaterials(r.data))
  }, [])

  const loadEstimate = async (pid) => {
    if (!pid) return
    setLoading(true)
    const [items, sum] = await Promise.all([
      getEstimate(pid),
      getEstimateSummary(pid),
    ])
    setItems(items.data)
    setSummary(sum.data)
    setLoading(false)
  }

  useEffect(() => { loadEstimate(selProject) }, [selProject])

  const handleAdd = async (form) => {
    await addEstimateItem(selProject, form)
    setShowAdd(false)
    loadEstimate(selProject)
  }

  const handleDelete = async (itemId) => {
    await deleteEstimateItem(selProject, itemId)
    loadEstimate(selProject)
  }

  // Group items by category for chart
  const chartData = summary
    ? Object.entries(summary.by_category || {}).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Cost Estimator</h1>
        <p className="text-sm text-gray-400 mt-1">Bill of Quantities with live pricing</p>
      </div>

      {/* Project selector */}
      <div className="card flex items-end gap-4">
        <div className="flex-1">
          <label className="label">Select Project</label>
          <select className="input" value={selProject}
            onChange={e => setSelProject(e.target.value)}>
            <option value="">Choose a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>
        {selProject && (
          <button className="btn-accent flex items-center gap-2"
            onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {!selProject ? (
        <div className="card text-center py-16">
          <Calculator size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a project to view or edit its estimate</p>
          <p className="text-sm text-gray-600 mt-1">
            Run the Plumbing Calculator first to auto-generate quantities
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading estimate…</div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Material Cost', val: `₱${(summary.material_cost || 0).toLocaleString()}`, color: 'text-blue-400' },
                { label: 'Labor Cost',    val: `₱${(summary.labor_cost || 0).toLocaleString()}`,    color: 'text-yellow-400' },
                { label: 'Grand Total',   val: `₱${(summary.grand_total || 0).toLocaleString()}`,   color: 'text-accent' },
                { label: 'Line Items',    val: summary.item_count || 0,                               color: 'text-green-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="card text-center">
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* BOQ Table */}
            <div className="lg:col-span-2 card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-gray-300">Bill of Quantities</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head">
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2">Cat</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit ₱</th>
                      <th className="px-3 py-2">Total ₱</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-gray-500">
                          No items yet. Run a calculator to auto-generate, or add manually.
                        </td>
                      </tr>
                    ) : items.map(item => (
                      <tr key={item.id} className="table-row group">
                        <td className="px-3 py-2 font-medium text-white">{item.item_name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs max-w-[120px] truncate" title={item.division || ''}>
                          {item.division ? item.division.replace(/Division \d+ - /, '') : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{item.category}</td>
                        <td className="px-3 py-2 text-center text-gray-400">{item.size || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-400">{item.unit || '—'}</td>
                        <td className="px-3 py-2 text-center text-white">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          ₱{(item.unit_price || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-accent">
                          ₱{(item.total_cost || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-accent">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {items.length > 0 && summary && (
                    <tfoot>
                      <tr className="bg-navy/40 font-semibold text-sm">
                        <td colSpan={7} className="px-3 py-3 text-right text-gray-300">GRAND TOTAL</td>
                        <td className="px-3 py-3 text-right text-accent text-base">
                          ₱{(summary.grand_total || 0).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Cost breakdown chart */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Cost Breakdown</h3>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#16213e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                      formatter={v => [`₱${v.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Category breakdown */}
              {summary && Object.entries(summary.by_category || {}).map(([cat, total]) => (
                <div key={cat} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-xs text-gray-400">{cat}</span>
                  <span className="text-xs font-medium text-white">₱{total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <AddItemModal
          projectId={selProject}
          materials={materials}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
