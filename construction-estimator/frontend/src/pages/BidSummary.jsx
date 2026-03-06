import { useEffect, useState } from 'react'
import { getProjects, getBidSummary, updateBidSettings } from '../utils/api'
import { DollarSign, RefreshCw } from 'lucide-react'

const fmt = (n) => (n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SectionCard({ title, color, total, children }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className={`px-4 py-3 border-b border-white/10 flex items-center justify-between ${color}`}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-sm font-bold text-white">₱{fmt(total)}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function LineRow({ label, amount, accent }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 ${accent ? 'text-accent' : ''}`}>
      <span className={`text-sm ${accent ? 'font-semibold text-white' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-white'}`}>₱{fmt(amount)}</span>
    </div>
  )
}

export default function BidSummary() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [contingency, setContingency] = useState(5)
  const [profit, setProfit]           = useState(10)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  const load = async (pid, cPct, pPct) => {
    if (!pid) return
    setLoading(true)
    const res = await getBidSummary(pid)
    setData(res.data)
    setContingency(res.data.contingency_pct ?? cPct ?? 5)
    setProfit(res.data.profit_pct ?? pPct ?? 10)
    setLoading(false)
  }

  useEffect(() => { load(selProject) }, [selProject])

  const handleApply = async () => {
    setSaving(true)
    await updateBidSettings(selProject, { contingency_pct: contingency, profit_pct: profit })
    await load(selProject, contingency, profit)
    setSaving(false)
  }

  const CONTRACT_LABEL = {
    lump_sum: 'Lump Sum', unit_price: 'Unit Price', cost_plus: 'Cost Plus',
  }
  const DELIVERY_LABEL = {
    design_bid_build: 'Design-Bid-Build', design_build: 'Design-Build', cm_at_risk: 'CM at Risk',
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Bid Summary</h1>
        <p className="text-sm text-gray-400 mt-1">
          Direct Cost + Subcontractors + Overhead + Contingency + Profit = Final Bid
        </p>
      </div>

      {/* Project selector */}
      <div className="card flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="label">Select Project</label>
          <select className="input" value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">Choose a project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        {selProject && (
          <button className="btn-ghost flex items-center gap-2 text-sm" onClick={() => load(selProject)}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {!selProject ? (
        <div className="card text-center py-16">
          <DollarSign size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a project to compute its final bid price</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Computing bid…</div>
      ) : data ? (
        <>
          {/* Project info strip */}
          <div className="card flex flex-wrap gap-6 py-3">
            <div>
              <p className="text-xs text-gray-500">Project</p>
              <p className="text-sm font-semibold text-white">{data.project_name}</p>
            </div>
            {data.client_name && (
              <div>
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-sm font-medium text-white">{data.client_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Contract Type</p>
              <p className="text-sm font-medium text-white">
                {CONTRACT_LABEL[data.contract_type] || data.contract_type || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivery Method</p>
              <p className="text-sm font-medium text-white">
                {DELIVERY_LABEL[data.delivery_method] || data.delivery_method || '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: three sections */}
            <div className="lg:col-span-2 space-y-4">

              {/* 1. Direct Construction Cost */}
              <SectionCard
                title="1. Direct Construction Cost"
                color="bg-navy/60"
                total={data.direct_cost}
              >
                {data.direct_cost_detail ? (
                  <div className="space-y-1">
                    <LineRow label="Material & Equipment Cost" amount={data.direct_cost_detail.material_cost} />
                    <LineRow label="Labor Cost" amount={data.direct_cost_detail.labor_cost} />
                    {Object.entries(data.direct_cost_detail.by_discipline || {}).map(([d, v]) => (
                      <div key={d} className="flex justify-between py-1 text-xs text-gray-600 border-b border-white/5 last:border-0 pl-4">
                        <span>{d}</span>
                        <span>₱{fmt(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No estimate items yet. Run calculators or add items in Cost Estimator.
                  </p>
                )}
              </SectionCard>

              {/* 2. Subcontractor Cost */}
              <SectionCard
                title="2. Subcontractor Cost"
                color="bg-blue-900/30"
                total={data.subcontractor_cost}
              >
                {Object.keys(data.subcontractor_detail || {}).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No selected bids yet. Go to Subcontractors to add and select bids.
                  </p>
                ) : (
                  Object.entries(data.subcontractor_detail).map(([trade, amt]) => (
                    <LineRow key={trade} label={trade} amount={amt} />
                  ))
                )}
              </SectionCard>

              {/* 3. Site Overhead */}
              <SectionCard
                title="3. Site Overhead"
                color="bg-purple-900/30"
                total={data.overhead_cost}
              >
                {Object.keys(data.overhead_detail || {}).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No overhead items yet. Go to Site Overhead to add project expenses.
                  </p>
                ) : (
                  Object.entries(data.overhead_detail).map(([cat, amt]) => (
                    <LineRow key={cat} label={cat} amount={amt} />
                  ))
                )}
              </SectionCard>
            </div>

            {/* Right: Final computation */}
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Markup Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Contingency (%)</label>
                    <input className="input" type="number" min="0" max="50" step="0.5"
                      value={contingency}
                      onChange={e => setContingency(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="label">Profit Markup (%)</label>
                    <input className="input" type="number" min="0" max="50" step="0.5"
                      value={profit}
                      onChange={e => setProfit(parseFloat(e.target.value) || 0)} />
                  </div>
                  <button className="btn-primary w-full flex items-center justify-center gap-2"
                    onClick={handleApply} disabled={saving}>
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
                    {saving ? 'Applying…' : 'Apply & Recalculate'}
                  </button>
                </div>
              </div>

              <div className="card space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Bid Computation</h3>

                <div className="space-y-2 border-b border-white/10 pb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Direct Cost</span>
                    <span className="text-white">₱{fmt(data.direct_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subcontractors</span>
                    <span className="text-white">₱{fmt(data.subcontractor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Site Overhead</span>
                    <span className="text-white">₱{fmt(data.overhead_cost)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm font-semibold py-1">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="text-white">₱{fmt(data.subtotal)}</span>
                </div>

                <div className="space-y-1 border-b border-white/10 pb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Contingency ({data.contingency_pct}%)</span>
                    <span className="text-white">₱{fmt(data.contingency_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Profit ({data.profit_pct}%)</span>
                    <span className="text-white">₱{fmt(data.profit_amount)}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">FINAL BID</span>
                    <span className="text-xl font-bold text-accent">₱{fmt(data.final_bid)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-right">
                    VAT exclusive
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
