import { useEffect, useState } from 'react'
import { getProjects, createProject, updateProject, deleteProject, getProjectSummary } from '../utils/api'
import { Plus, Pencil, Trash2, Building2, X } from 'lucide-react'

const BUILDING_TYPES   = ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Infrastructure', 'Mixed-Use']
const WATER_SOURCES    = ['Municipal', 'Deepwell', 'Rainwater Harvesting', 'Combined']
const CONTRACT_TYPES   = [
  { value: 'lump_sum',     label: 'Lump Sum' },
  { value: 'unit_price',   label: 'Unit Price' },
  { value: 'cost_plus',    label: 'Cost Plus' },
]
const DELIVERY_METHODS = [
  { value: 'design_bid_build', label: 'Design-Bid-Build' },
  { value: 'design_build',     label: 'Design-Build' },
  { value: 'cm_at_risk',       label: 'CM at Risk' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg border border-white/10 w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ProjectForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    project_name: '', client_name: '', location: '', project_description: '',
    building_type: 'Residential', contract_type: 'lump_sum', delivery_method: 'design_bid_build',
    estimated_duration: '', floors: 1, building_area: 0,
    water_source: 'Municipal', tank_capacity: 1000,
    distance_from_manila: 0, transport_cost_per_km: 50, num_workers: 5,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Project Info</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Project Name *</label>
          <input className="input" required value={form.project_name}
            onChange={e => set('project_name', e.target.value)} placeholder="e.g. SM Mall Phase 2" />
        </div>
        <div>
          <label className="label">Client / Owner Name</label>
          <input className="input" value={form.client_name || ''}
            onChange={e => set('client_name', e.target.value)} placeholder="Company or person name" />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={form.location || ''}
            onChange={e => set('location', e.target.value)} placeholder="City / Province" />
        </div>
        <div className="col-span-2">
          <label className="label">Project Description</label>
          <textarea className="input" rows={2} value={form.project_description || ''}
            onChange={e => set('project_description', e.target.value)}
            placeholder="Brief scope description…" />
        </div>
        <div>
          <label className="label">Building Type</label>
          <select className="input" value={form.building_type}
            onChange={e => set('building_type', e.target.value)}>
            {BUILDING_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Contract Type</label>
          <select className="input" value={form.contract_type || 'lump_sum'}
            onChange={e => set('contract_type', e.target.value)}>
            {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Delivery Method</label>
          <select className="input" value={form.delivery_method || 'design_bid_build'}
            onChange={e => set('delivery_method', e.target.value)}>
            {DELIVERY_METHODS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Est. Duration (months)</label>
          <input className="input" type="number" min="1" step="1" value={form.estimated_duration || ''}
            onChange={e => set('estimated_duration', parseInt(e.target.value) || null)}
            placeholder="e.g. 12" />
        </div>
        <div>
          <label className="label">Number of Floors</label>
          <input className="input" type="number" min="1" max="200" value={form.floors}
            onChange={e => set('floors', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="label">Building Area (m²)</label>
          <input className="input" type="number" min="0" step="10" value={form.building_area || 0}
            onChange={e => set('building_area', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Water Source</label>
          <select className="input" value={form.water_source}
            onChange={e => set('water_source', e.target.value)}>
            {WATER_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tank Capacity (Liters)</label>
          <input className="input" type="number" min="0" step="100" value={form.tank_capacity}
            onChange={e => set('tank_capacity', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold pt-1">
        Mobilization (outside Metro Manila)
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Distance from Manila (km)</label>
          <input className="input" type="number" min="0" step="1" value={form.distance_from_manila || 0}
            onChange={e => set('distance_from_manila', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Transport Cost / km (₱)</label>
          <input className="input" type="number" min="0" step="5" value={form.transport_cost_per_km || 50}
            onChange={e => set('transport_cost_per_km', parseFloat(e.target.value) || 50)} />
        </div>
        <div>
          <label className="label">Number of Workers</label>
          <input className="input" type="number" min="1" step="1" value={form.num_workers || 5}
            onChange={e => set('num_workers', parseInt(e.target.value) || 5)} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Project</button>
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
      </div>
    </form>
  )
}

export default function Projects() {
  const [projects, setProjects]   = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)

  const load = async () => {
    setLoading(true)
    const res = await getProjects()
    setProjects(res.data)
    const sums = {}
    await Promise.all(res.data.map(async p => {
      try {
        const s = await getProjectSummary(p.id)
        sums[p.id] = s.data
      } catch {}
    }))
    setSummaries(sums)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    if (editing) {
      await updateProject(editing.id, form)
    } else {
      await createProject(form)
    }
    setShowModal(false)
    setEditing(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its estimates?')) return
    await deleteProject(id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-accent flex items-center gap-2"
          onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No projects yet</p>
          <p className="text-sm text-gray-600 mt-1">Create your first project to begin estimating</p>
          <button className="btn-primary mt-4"
            onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={14} className="inline mr-1" /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => {
            const sum = summaries[p.id]
            return (
              <div key={p.id} className="card hover:border-navy-light/40 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{p.project_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{p.location || '—'}</p>
                  </div>
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(p); setShowModal(true) }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Type',   val: p.building_type?.slice(0, 5) || '—' },
                    { label: 'Floors', val: p.floors || '—' },
                    { label: 'Area',   val: p.building_area ? `${p.building_area}m²` : '—' },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white/5 rounded p-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-medium text-white mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>

                {sum && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Total Estimate</p>
                      <p className="text-lg font-bold text-accent">
                        ₱{(sum.grand_total || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="text-sm font-medium text-white">{sum.item_count || 0}</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/5">
                  {p.client_name && (
                    <p className="text-xs text-gray-400 font-medium">Client: {p.client_name}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {p.contract_type?.replace('_', ' ') || 'Lump Sum'} · Water: {p.water_source || '—'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Created: {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Project' : 'New Project'}
          onClose={() => { setShowModal(false); setEditing(null) }}
        >
          <ProjectForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditing(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
