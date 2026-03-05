import { useEffect, useState } from 'react'
import { getProjects, runElectricalAnalysis, saveElectrical } from '../utils/api'
import { Plus, Trash2, Zap, Save, AlertTriangle, CheckCircle } from 'lucide-react'

const LOAD_TYPES = [
  'Lighting', 'Convenience Outlet', 'Air Conditioning', 'Motors',
  'Electric Water Heater', 'Refrigeration', 'Computers/IT', 'Elevator', 'General',
]

const DEFAULT_DEMAND_FACTORS = {
  Lighting: 0.80, 'Convenience Outlet': 0.50, 'Air Conditioning': 1.00,
  Motors: 0.75, 'Electric Water Heater': 1.00, Refrigeration: 0.75,
  'Computers/IT': 0.80, Elevator: 0.50, General: 0.80,
}

const emptyCircuit = (i = 1) => ({
  id: Date.now() + i,
  name: `Circuit ${i}`,
  load_type: 'General',
  quantity: 1,
  watts_per_unit: 100,
  demand_factor: 0.80,
  cable_length_m: 30,
})

function ResultCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="card text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function ElectricalCalculator() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [circuits, setCircuits]     = useState([emptyCircuit(1)])
  const [settings, setSettings]     = useState({
    supply_phase: 'single', power_factor: 0.85,
    supply_voltage: 220, cable_length_m: 30,
    critical_load_pct: 0.60, diversity_factor: 0.80,
    building_type: 'Residential',
  })
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  const setSetting = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  const addCircuit = () => setCircuits(cs => [
    ...cs, emptyCircuit(cs.length + 1),
  ])

  const removeCircuit = (id) => setCircuits(cs => cs.filter(c => c.id !== id))

  const updateCircuit = (id, k, v) => setCircuits(cs =>
    cs.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [k]: v }
      if (k === 'load_type') updated.demand_factor = DEFAULT_DEMAND_FACTORS[v] ?? 0.80
      return updated
    })
  )

  const runAnalysis = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const payload = {
        circuits: circuits.map(({ id, ...c }) => c),
        ...settings,
      }
      const r = await runElectricalAnalysis(payload)
      setResult(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveToProject = async () => {
    if (!selProject || !result) return
    setSaving(true)
    try {
      await saveElectrical(selProject, {
        project_id: parseInt(selProject),
        circuits: circuits.map(({ id, ...c }) => c),
        supply_phase: settings.supply_phase,
        power_factor: settings.power_factor,
        supply_voltage: settings.supply_voltage,
      })
      setSaved(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const se = result?.service_entrance
  const tr = result?.transformer
  const gen = result?.generator
  const gr = result?.grounding

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-yellow-400" size={22} /> Electrical Calculator
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Load calculation · Cable sizing · Panel schedule · Transformer & Generator sizing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-48" value={selProject}
            onChange={e => setSelProject(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          {result && selProject && (
            <button className="btn-accent flex items-center gap-2"
              onClick={saveToProject} disabled={saving}>
              {saved ? <CheckCircle size={16} className="text-green-400" /> : <Save size={16} />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save to Project'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Settings + Circuits */}
        <div className="lg:col-span-2 space-y-4">
          {/* System Settings */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">System Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">Supply Phase</label>
                <select className="input" value={settings.supply_phase}
                  onChange={e => setSetting('supply_phase', e.target.value)}>
                  <option value="single">Single Phase (1Ø)</option>
                  <option value="three">Three Phase (3Ø)</option>
                </select>
              </div>
              <div>
                <label className="label">Voltage (V)</label>
                <select className="input" value={settings.supply_voltage}
                  onChange={e => setSetting('supply_voltage', parseFloat(e.target.value))}>
                  <option value={220}>220V (1Ø)</option>
                  <option value={380}>380V (3Ø)</option>
                </select>
              </div>
              <div>
                <label className="label">Power Factor</label>
                <input className="input" type="number" min="0.70" max="1.00" step="0.01"
                  value={settings.power_factor}
                  onChange={e => setSetting('power_factor', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="label">Default Cable Run (m)</label>
                <input className="input" type="number" min="1" step="1"
                  value={settings.cable_length_m}
                  onChange={e => setSetting('cable_length_m', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="label">Diversity Factor</label>
                <input className="input" type="number" min="0.50" max="1.00" step="0.05"
                  value={settings.diversity_factor}
                  onChange={e => setSetting('diversity_factor', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="label">Critical Load %</label>
                <input className="input" type="number" min="0" max="1" step="0.05"
                  value={settings.critical_load_pct}
                  onChange={e => setSetting('critical_load_pct', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="label">Building Type</label>
                <select className="input" value={settings.building_type}
                  onChange={e => setSetting('building_type', e.target.value)}>
                  {['Residential','Commercial','Industrial','Institutional'].map(t =>
                    <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Circuit Table */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-gray-300">Circuit Schedule</h3>
              <button className="btn-primary flex items-center gap-1 text-xs py-1.5"
                onClick={addCircuit}>
                <Plus size={13} /> Add Circuit
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head">
                    <th className="text-left px-3 py-2">Circuit Name</th>
                    <th className="px-2 py-2">Load Type</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">W/unit</th>
                    <th className="px-2 py-2">Demand Factor</th>
                    <th className="px-2 py-2">Cable Run (m)</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {circuits.map((c, i) => (
                    <tr key={c.id} className="table-row">
                      <td className="px-3 py-1.5">
                        <input className="input py-1 text-xs" value={c.name}
                          onChange={e => updateCircuit(c.id, 'name', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input py-1 text-xs" value={c.load_type}
                          onChange={e => updateCircuit(c.id, 'load_type', e.target.value)}>
                          {LOAD_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-xs w-16" type="number" min="1"
                          value={c.quantity}
                          onChange={e => updateCircuit(c.id, 'quantity', parseInt(e.target.value) || 1)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-xs w-20" type="number" min="0"
                          value={c.watts_per_unit}
                          onChange={e => updateCircuit(c.id, 'watts_per_unit', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-xs w-16" type="number" min="0" max="1" step="0.05"
                          value={c.demand_factor}
                          onChange={e => updateCircuit(c.id, 'demand_factor', parseFloat(e.target.value) || 0.8)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-xs w-16" type="number" min="1"
                          value={c.cable_length_m}
                          onChange={e => updateCircuit(c.id, 'cable_length_m', parseFloat(e.target.value) || 30)} />
                      </td>
                      <td className="px-2 py-1.5">
                        {circuits.length > 1 && (
                          <button onClick={() => removeCircuit(c.id)}
                            className="text-gray-600 hover:text-accent">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="btn-accent w-full flex items-center justify-center gap-2"
            onClick={runAnalysis} disabled={loading}>
            <Zap size={16} />
            {loading ? 'Calculating…' : 'Run Electrical Analysis'}
          </button>
        </div>

        {/* Right: Quick results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Load Summary</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Connected Load',  val: `${result.summary.total_connected_kw} kW` },
                    { label: 'Demand Load',     val: `${result.summary.total_demand_kw} kW`,   color: 'text-yellow-400' },
                    { label: 'Diversity Load',  val: `${result.summary.diversity_demand_kw} kW` },
                    { label: 'Demand (kVA)',    val: `${result.summary.total_demand_kva} kVA` },
                    { label: 'Power Factor',    val: result.summary.power_factor },
                    { label: 'Supply',          val: `${result.summary.supply_voltage}V ${result.summary.supply_phase === 'three' ? '3Ø' : '1Ø'}` },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between text-xs py-1 border-b border-white/5">
                      <span className="text-gray-400">{label}</span>
                      <span className={`font-medium ${color || 'text-white'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Service Entrance</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Main Current',        val: `${se?.main_current_a} A` },
                    { label: 'Main Breaker',        val: `${se?.main_breaker_a} A MCCB`, color: 'text-yellow-400' },
                    { label: 'Main Wire',           val: `${se?.main_wire_size_mm2} mm²` },
                    { label: 'Feeder VD%',          val: `${se?.feeder_vd_pct}%`, color: se?.feeder_vd_ok ? 'text-green-400' : 'text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between text-xs py-1 border-b border-white/5">
                      <span className="text-gray-400">{label}</span>
                      <span className={`font-medium ${color || 'text-white'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Equipment Sizing</h3>
                <div className="space-y-1 text-xs">
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400">Transformer</p>
                    <p className="text-white font-bold text-sm">{tr?.selected_kva} kVA</p>
                    <p className="text-gray-500">{tr?.type}</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400">Generator (Standby)</p>
                    <p className="text-white font-bold text-sm">{gen?.selected_kva} kVA</p>
                    <p className="text-gray-500">Critical load: {gen?.critical_load_kw} kW</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-gray-400">Ground Wire</p>
                    <p className="text-white font-bold">{gr?.ground_wire_mm2} mm²</p>
                    <p className="text-gray-500">{gr?.electrode_system}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <Zap size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Add circuits and run analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Schedule Table */}
      {result?.panel_schedule && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300">Panel Board Schedule</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-head">
                  <th className="text-left px-3 py-2">Circuit</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Connected kW</th>
                  <th className="px-3 py-2">Demand kW</th>
                  <th className="px-3 py-2">Current (A)</th>
                  <th className="px-3 py-2">Wire (mm²)</th>
                  <th className="px-3 py-2">Breaker (A)</th>
                  <th className="px-3 py-2">VD%</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.panel_schedule.map((c, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-3 py-2 font-medium text-white">{c.circuit_name}</td>
                    <td className="px-3 py-2 text-gray-400">{c.load_type}</td>
                    <td className="px-3 py-2 text-center">{c.connected_kw}</td>
                    <td className="px-3 py-2 text-center text-yellow-400">{c.demand_kw}</td>
                    <td className="px-3 py-2 text-center">{c.current_a}</td>
                    <td className="px-3 py-2 text-center text-blue-300">{c.wire_size_mm2} mm²</td>
                    <td className="px-3 py-2 text-center text-accent">{c.breaker_a}A</td>
                    <td className="px-3 py-2 text-center">
                      <span className={c.voltage_drop_ok ? 'text-green-400' : 'text-red-400'}>
                        {c.voltage_drop_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.voltage_drop_ok
                        ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                        : <AlertTriangle size={13} className="text-red-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Quantities */}
      {result?.material_quantities && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300">
              Electrical Bill of Materials
              {selProject && (
                <span className="ml-2 text-xs text-gray-500">
                  (Auto-generates BOQ when saved to project)
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-head">
                  <th className="text-left px-3 py-2">Material</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                </tr>
              </thead>
              <tbody>
                {result.material_quantities.map((m, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-3 py-2 font-medium text-white">{m.material}</td>
                    <td className="px-3 py-2 text-gray-400">{m.category}</td>
                    <td className="px-3 py-2 text-center text-gray-300">{m.size || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-accent">{m.quantity}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
