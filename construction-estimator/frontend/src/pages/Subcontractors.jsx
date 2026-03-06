import { useEffect, useState } from 'react'
import {
  getProjects, getSubcontractors, addSubcontractor, deleteSubcontractor,
  selectSubcontractor, getSubcontractorSummary,
} from '../utils/api'
import { Plus, Trash2, X, CheckCircle, Circle, Truck } from 'lucide-react'

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Fire Protection', 'Elevator', 'Facade', 'Landscaping', 'Other']

function AddBidModal({ onSave, onClose }) {
  const [form, setForm] = useState({ trade: 'Electrical', company_name: '', bid_amount: 0, notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg border border-white/10 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Add Subcontractor Bid</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Trade / Scope</label>
            <select className="input" value={form.trade} onChange={e => set('trade', e.target.value)}>
              {TRADES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Company Name</label>
            <input className="input" value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="e.g. ABC Electrical Contractors" />
          </div>
          <div>
            <label className="label">Bid Amount (₱)</label>
            <input className="input" type="number" min="0" step="1000" value={form.bid_amount}
              onChange={e => set('bid_amount', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Notes / Scope Inclusions</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Material inclusions, exclusions, payment terms…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1"
              onClick={() => { if (form.company_name && form.bid_amount >= 0) onSave(form) }}>
              Add Bid
            </button>
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Subcontractors() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [bids, setBids]             = useState([])
  const [summary, setSummary]       = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  const load = async (pid) => {
    if (!pid) return
    setLoading(true)
    const [b, s] = await Promise.all([getSubcontractors(pid), getSubcontractorSummary(pid)])
    setBids(b.data)
    setSummary(s.data)
    setLoading(false)
  }

  useEffect(() => { load(selProject) }, [selProject])

  const handleAdd = async (form) => {
    await addSubcontractor(selProject, form)
    setShowAdd(false)
    load(selProject)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this bid?')) return
    await deleteSubcontractor(selProject, id)
    load(selProject)
  }

  const handleSelect = async (id) => {
    await selectSubcontractor(selProject, id)
    load(selProject)
  }

  // Group bids by trade
  const byTrade = bids.reduce((acc, b) => {
    if (!acc[b.trade]) acc[b.trade] = []
    acc[b.trade].push(b)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Subcontractor Pricing</h1>
        <p className="text-sm text-gray-400 mt-1">Compare and select subcontractor bids by trade</p>
      </div>

      {/* Project selector + Add */}
      <div className="card flex items-end gap-4">
        <div className="flex-1">
          <label className="label">Select Project</label>
          <select className="input" value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">Choose a project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        {selProject && (
          <button className="btn-accent flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Bid
          </button>
        )}
      </div>

      {!selProject ? (
        <div className="card text-center py-16">
          <Truck size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a project to manage subcontractor bids</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : (
        <>
          {/* Total Selected */}
          {summary && (
            <div className="card flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Selected Subcontractor Cost</p>
                <p className="text-2xl font-bold text-accent">
                  ₱{(summary.total_subcontractor_cost || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Trades with selected bid</p>
                <p className="text-lg font-semibold text-white">
                  {Object.keys(summary.by_trade || {}).length}
                </p>
              </div>
            </div>
          )}

          {/* Trade Groups */}
          {Object.keys(byTrade).length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 text-sm">No bids yet. Add bids for each subcontracted trade.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(byTrade).map(([trade, tradeBids]) => (
                <div key={trade} className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{trade}</h3>
                    <span className="text-xs text-gray-500">{tradeBids.length} bid{tradeBids.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-head text-xs">
                        <th className="text-left px-4 py-2">Company</th>
                        <th className="px-4 py-2 text-right">Bid Amount</th>
                        <th className="px-4 py-2">Notes</th>
                        <th className="px-4 py-2 text-center">Selected</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeBids.sort((a, b) => a.bid_amount - b.bid_amount).map((bid, i) => (
                        <tr key={bid.id}
                          className={`table-row group ${bid.is_selected ? 'bg-emerald-900/10 border-l-2 border-l-accent' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-white">
                            {bid.company_name || '—'}
                            {i === 0 && tradeBids.length > 1 && (
                              <span className="ml-2 text-xs text-emerald-400 font-normal">Lowest</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-accent">
                            ₱{bid.bid_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{bid.notes || '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => handleSelect(bid.id)}
                              className={`transition-colors ${bid.is_selected ? 'text-accent' : 'text-gray-600 hover:text-gray-300'}`}>
                              {bid.is_selected ? <CheckCircle size={18} /> : <Circle size={18} />}
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => handleDelete(bid.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-accent">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddBidModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
