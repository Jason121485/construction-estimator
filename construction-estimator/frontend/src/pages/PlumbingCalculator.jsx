import { useEffect, useState } from 'react'
import { getFixtureTable, runAnalysis, getProjects, autoGenerate } from '../utils/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Droplets, Play, Save, AlertCircle, CheckCircle } from 'lucide-react'

const PIPE_MATERIALS = ['PPR', 'PVC', 'GI', 'Copper', 'HDPE']
const BUILDING_TYPES = [
  { value: 'private', label: 'Private / Residential' },
  { value: 'public',  label: 'Public / Commercial' },
]
const COLORS = ['#0f3460','#e94560','#16213e','#1a4a80','#c23351','#0d7377','#2b2d42']

function VelocityBadge({ ok }) {
  return ok
    ? <span className="badge bg-green-500/20 text-green-400">✓ OK</span>
    : <span className="badge bg-red-500/20 text-red-400">⚠ Check</span>
}

export default function PlumbingCalculator() {
  const [fixtureTable, setFixtureTable]   = useState([])
  const [fixtures, setFixtures]           = useState([])
  const [projects, setProjects]           = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [config, setConfig] = useState({
    floors: 1, building_type: 'private',
    pipe_material: 'PPR', tank_capacity: 1000,
  })
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getFixtureTable().then(r => {
      setFixtureTable(r.data)
      setFixtures(r.data.slice(0, 6).map(f => ({
        fixture_type: f.fixture_type,
        fixture_name: f.fixture_name,
        quantity: 0,
        wsfu: f.wsfu_private || f.wsfu_public || 1,
      })))
    })
    getProjects().then(r => setProjects(r.data))
  }, [])

  const setQty = (i, qty) =>
    setFixtures(prev => prev.map((f, idx) => idx === i ? { ...f, quantity: qty } : f))

  const addFixture = () => {
    const ft = fixtureTable.find(f =>
      !fixtures.some(x => x.fixture_type === f.fixture_type)
    )
    if (ft) setFixtures(prev => [...prev, {
      fixture_type: ft.fixture_type,
      fixture_name: ft.fixture_name,
      quantity: 0,
      wsfu: config.building_type === 'private' ? (ft.wsfu_private || ft.wsfu_public) : (ft.wsfu_public || ft.wsfu_private),
    }])
  }

  const changeFixtureType = (i, type) => {
    const ft = fixtureTable.find(f => f.fixture_type === type)
    if (!ft) return
    setFixtures(prev => prev.map((f, idx) => idx === i ? {
      ...f,
      fixture_type: ft.fixture_type,
      fixture_name: ft.fixture_name,
      wsfu: config.building_type === 'private' ? (ft.wsfu_private || ft.wsfu_public) : (ft.wsfu_public || ft.wsfu_private),
    } : f))
  }

  const removeFixture = (i) => setFixtures(prev => prev.filter((_, idx) => idx !== i))

  const analyze = async () => {
    const active = fixtures.filter(f => f.quantity > 0)
    if (active.length === 0) {
      setError('Enter at least one fixture quantity.')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await runAnalysis({
        fixtures: active.map(f => ({
          fixture_type: f.fixture_type,
          quantity: f.quantity,
          wsfu: f.wsfu,
        })),
        ...config,
      })
      setResult(res.data)
    } catch (e) {
      setError('Calculation failed. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  const saveToProject = async () => {
    if (!selectedProject || !result) return
    setSaved(false)
    try {
      await autoGenerate(selectedProject, {
        material_quantities: result.material_quantities,
      })
      setSaved(true)
    } catch {
      setError('Failed to save estimate to project.')
    }
  }

  const wsfu_chart = result?.fixture_analysis?.fixtures
    .filter(f => f.total_wsfu > 0)
    .map(f => ({ name: f.fixture_name, value: f.total_wsfu }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Plumbing Calculator</h1>
        <p className="text-sm text-gray-400 mt-1">
          Hunter's Method fixture analysis → pipe sizing → material quantities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === INPUT PANEL === */}
        <div className="lg:col-span-1 space-y-4">
          {/* Config */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Droplets size={15} /> Project Settings
            </h2>
            <div>
              <label className="label">Building Type</label>
              <select className="input" value={config.building_type}
                onChange={e => setConfig(c => ({ ...c, building_type: e.target.value }))}>
                {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Floors</label>
                <input className="input" type="number" min="1" value={config.floors}
                  onChange={e => setConfig(c => ({ ...c, floors: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="label">Pipe Material</label>
                <select className="input" value={config.pipe_material}
                  onChange={e => setConfig(c => ({ ...c, pipe_material: e.target.value }))}>
                  {PIPE_MATERIALS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Tank Capacity (L)</label>
              <input className="input" type="number" min="0" step="100" value={config.tank_capacity}
                onChange={e => setConfig(c => ({ ...c, tank_capacity: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Fixtures */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">Fixture Schedule</h2>
              <button onClick={addFixture}
                className="text-xs text-navy-light hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors">
                + Add
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="text-left px-2 py-1.5">Fixture</th>
                    <th className="px-2 py-1.5">Qty</th>
                    <th className="px-2 py-1.5">WSFU</th>
                    <th className="px-2 py-1.5">Total</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((f, i) => (
                    <tr key={i} className="table-row">
                      <td className="px-2 py-1.5">
                        <select
                          className="bg-transparent text-white text-xs w-full"
                          value={f.fixture_type}
                          onChange={e => changeFixtureType(i, e.target.value)}
                        >
                          {fixtureTable.map(ft => (
                            <option key={ft.fixture_type} value={ft.fixture_type}
                              style={{ background: '#16213e' }}>
                              {ft.fixture_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0"
                          className="bg-white/5 border border-white/10 rounded px-1 py-0.5 w-14 text-center text-xs text-white"
                          value={f.quantity}
                          onChange={e => setQty(i, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{f.wsfu}</td>
                      <td className="px-2 py-1.5 text-center text-xs font-medium text-white">
                        {(f.quantity * f.wsfu).toFixed(1)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeFixture(i)}
                          className="text-gray-600 hover:text-accent text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded p-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button onClick={analyze} disabled={loading}
            className="btn-accent w-full flex items-center justify-center gap-2 py-2.5">
            {loading ? 'Calculating…' : <><Play size={16} /> Run Analysis</>}
          </button>
        </div>

        {/* === RESULTS PANEL === */}
        <div className="lg:col-span-2 space-y-4">
          {!result ? (
            <div className="card h-64 flex items-center justify-center">
              <div className="text-center">
                <Droplets size={40} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">Enter fixtures and click Run Analysis</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total WSFU',       val: result.fixture_analysis.total_wsfu },
                  { label: 'Peak Flow (LPS)',  val: result.fixture_analysis.peak_flow_lps },
                  { label: 'Peak Flow (GPM)',  val: result.fixture_analysis.peak_flow_gpm },
                  { label: 'Daily Demand (m³)',val: result.fixture_analysis.daily_demand_m3 },
                ].map(({ label, val }) => (
                  <div key={label} className="card text-center">
                    <p className="text-xl font-bold text-white">{val}</p>
                    <p className="text-xs text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WSFU Pie Chart */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">WSFU Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={wsfu_chart} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={2}>
                        {wsfu_chart?.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#16213e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                        formatter={(v, n) => [v.toFixed(2), n]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Pipe Sizing */}
                <div className="card overflow-x-auto">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Pipe Sizing Results</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="table-head">
                        <th className="text-left px-2 py-1.5">Section</th>
                        <th className="px-2 py-1.5">Ø mm</th>
                        <th className="px-2 py-1.5">V (m/s)</th>
                        <th className="px-2 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.pipe_sizing.map((p, i) => (
                        <tr key={i} className="table-row">
                          <td className="px-2 py-1.5 text-gray-300">{p.section}</td>
                          <td className="px-2 py-1.5 text-center font-medium text-white">{p.pipe_diameter_mm}</td>
                          <td className="px-2 py-1.5 text-center text-gray-300">{p.velocity_mps}</td>
                          <td className="px-2 py-1.5 text-center"><VelocityBadge ok={p.velocity_ok} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Material Quantities */}
              <div className="card overflow-x-auto">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Estimated Material Quantities</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head">
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-left px-3 py-2">Material</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="text-left px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.material_quantities.map((m, i) => (
                      <tr key={i} className="table-row">
                        <td className="px-3 py-2">
                          <span className="badge bg-navy/60 text-blue-300">{m.category}</span>
                        </td>
                        <td className="px-3 py-2 text-white font-medium">{m.material}</td>
                        <td className="px-3 py-2 text-center text-gray-300">{m.size}</td>
                        <td className="px-3 py-2 text-center text-gray-400">{m.unit}</td>
                        <td className="px-3 py-2 text-center font-bold text-accent">{m.quantity}</td>
                        <td className="px-3 py-2 text-gray-500">{m.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save to project */}
              <div className="card flex items-center gap-4">
                <div className="flex-1">
                  <label className="label">Save Estimate to Project</label>
                  <select className="input" value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}>
                    <option value="">Select a project…</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={saveToProject} disabled={!selectedProject}
                  className="btn-primary flex items-center gap-2 mt-5 disabled:opacity-40">
                  <Save size={16} /> Save
                </button>
                {saved && (
                  <div className="flex items-center gap-1 text-green-400 text-sm mt-5">
                    <CheckCircle size={16} /> Saved!
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
