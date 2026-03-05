import { useEffect, useState } from 'react'
import { getProjects, runSolarAnalysis, saveSolar, getSolarConstants } from '../utils/api'
import { Sun, Save, CheckCircle, Zap, Battery, TrendingUp, Leaf } from 'lucide-react'

const SYSTEM_TYPE_LABELS = {
  grid_tied: 'Grid-Tied (No Battery)',
  off_grid:  'Off-Grid / Standalone',
  hybrid:    'Hybrid (Grid + Battery)',
}

const DEFAULT_INPUTS = {
  monthly_kwh: 500,
  location: 'General (Luzon)',
  panel_wattage_wp: 400,
  battery_type: 'Lithium (LFP)',
  backup_hours: 4,
  system_type: 'grid_tied',
  roof_area_m2: '',
}

function InfoRow({ label, value, color = 'text-white', sub }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-right">
        <span className={`text-xs font-medium ${color}`}>{value}</span>
        {sub && <p className="text-xs text-gray-600">{sub}</p>}
      </div>
    </div>
  )
}

export default function SolarCalculator() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [inputs, setInputs]         = useState(DEFAULT_INPUTS)
  const [constants, setConstants]   = useState(null)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    getProjects().then(r => setProjects(r.data))
    getSolarConstants().then(r => setConstants(r.data))
  }, [])

  const set = (k, v) => setInputs(i => ({ ...i, [k]: v }))

  const runAnalysis = async () => {
    setLoading(true); setSaved(false)
    try {
      const payload = {
        ...inputs,
        monthly_kwh: parseFloat(inputs.monthly_kwh) || 0,
        panel_wattage_wp: parseFloat(inputs.panel_wattage_wp) || 400,
        backup_hours: parseFloat(inputs.backup_hours) || 4,
        roof_area_m2: inputs.roof_area_m2 ? parseFloat(inputs.roof_area_m2) : null,
      }
      const r = await runSolarAnalysis(payload)
      setResult(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveToProject = async () => {
    if (!selProject || !result) return
    setSaving(true)
    try {
      await saveSolar(selProject, {
        project_id: parseInt(selProject),
        ...inputs,
        monthly_kwh: parseFloat(inputs.monthly_kwh) || 0,
        panel_wattage_wp: parseFloat(inputs.panel_wattage_wp) || 400,
        backup_hours: parseFloat(inputs.backup_hours) || 4,
        roof_area_m2: inputs.roof_area_m2 ? parseFloat(inputs.roof_area_m2) : null,
      })
      setSaved(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const energy = result?.energy
  const pv     = result?.pv_array
  const inv    = result?.inverter
  const bat    = result?.battery
  const fin    = result?.financials

  const locations = constants?.locations || ['General (Luzon)']
  const panels    = constants?.panel_wattages || [400]
  const batTypes  = constants?.battery_types || ['Lithium (LFP)']
  const sysTypes  = constants?.system_types || {}

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sun className="text-yellow-400" size={22} /> Solar PV Calculator
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Panel sizing · Inverter · Battery · Energy production · Financial analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-48" value={selProject} onChange={e => setSelProject(e.target.value)}>
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
        {/* Left: Inputs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">System Design Inputs</h3>

            <div>
              <label className="label">Monthly Consumption (kWh)</label>
              <input className="input" type="number" min="0" step="10" value={inputs.monthly_kwh}
                onChange={e => set('monthly_kwh', e.target.value)} />
              <p className="text-xs text-gray-600 mt-0.5">Check your MERALCO bill</p>
            </div>

            <div>
              <label className="label">Project Location</label>
              <select className="input" value={inputs.location} onChange={e => set('location', e.target.value)}>
                {locations.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="label">System Type</label>
              <select className="input" value={inputs.system_type} onChange={e => set('system_type', e.target.value)}>
                {Object.entries(sysTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                {!Object.keys(sysTypes).length && (
                  <>
                    <option value="grid_tied">Grid-Tied (No Battery)</option>
                    <option value="off_grid">Off-Grid / Standalone</option>
                    <option value="hybrid">Hybrid (Grid + Battery)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="label">Panel Wattage (Wp)</label>
              <select className="input" value={inputs.panel_wattage_wp}
                onChange={e => set('panel_wattage_wp', e.target.value)}>
                {panels.map(w => <option key={w} value={w}>{w} Wp</option>)}
              </select>
            </div>

            {inputs.system_type !== 'grid_tied' && (
              <>
                <div>
                  <label className="label">Battery Type</label>
                  <select className="input" value={inputs.battery_type} onChange={e => set('battery_type', e.target.value)}>
                    {batTypes.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Backup Hours</label>
                  <input className="input" type="number" min="1" max="24" step="0.5"
                    value={inputs.backup_hours} onChange={e => set('backup_hours', e.target.value)} />
                </div>
              </>
            )}

            <div>
              <label className="label">Available Roof Area (m²) — optional</label>
              <input className="input" type="number" min="0" step="5" placeholder="Leave blank if unknown"
                value={inputs.roof_area_m2} onChange={e => set('roof_area_m2', e.target.value)} />
            </div>

            <button className="btn-accent w-full flex items-center justify-center gap-2 mt-2"
              onClick={runAnalysis} disabled={loading}>
              <Sun size={16} />
              {loading ? 'Calculating…' : 'Calculate Solar System'}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card text-center">
                  <Sun size={20} className="text-yellow-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-yellow-400">{pv?.actual_kw} kWp</p>
                  <p className="text-xs text-gray-400">System Size</p>
                </div>
                <div className="card text-center">
                  <Zap size={20} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-400">{pv?.num_panels}</p>
                  <p className="text-xs text-gray-400">Solar Panels ({pv?.panel_wattage_wp}Wp)</p>
                </div>
                <div className="card text-center">
                  <Battery size={20} className="text-green-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-400">{inv?.selected_kw} kW</p>
                  <p className="text-xs text-gray-400">Inverter</p>
                </div>
                <div className="card text-center">
                  <TrendingUp size={20} className="text-accent mx-auto mb-1" />
                  <p className="text-xl font-bold text-accent">
                    {energy?.monthly_production_kwh?.toLocaleString()} kWh
                  </p>
                  <p className="text-xs text-gray-400">Monthly Production</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PV Array */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Sun size={14} className="text-yellow-400" /> PV Array Design
                  </h3>
                  <InfoRow label="Required Capacity" value={`${pv?.required_kw} kWp`} />
                  <InfoRow label="Actual Capacity"   value={`${pv?.actual_kw} kWp`}   color="text-yellow-400" />
                  <InfoRow label="Number of Panels"  value={pv?.num_panels}            color="text-yellow-400" />
                  <InfoRow label="Panel Wattage"     value={`${pv?.panel_wattage_wp} Wp`} />
                  <InfoRow label="Strings × Panels"  value={`${pv?.num_strings} × ${pv?.panels_per_string}`} />
                  <InfoRow label="Roof Area Required" value={`${pv?.required_roof_m2} m²`}
                    color={pv?.roof_area_ok ? 'text-green-400' : 'text-red-400'} />
                  <InfoRow label="Peak Sun Hours"    value={`${result.peak_sun_hours} hrs/day`} />
                  <InfoRow label="Performance Ratio" value={`${(result.performance_ratio * 100).toFixed(0)}%`} />
                </div>

                {/* Energy */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent" /> Energy Analysis
                  </h3>
                  <InfoRow label="Daily Consumption" value={`${energy?.daily_consumption_kwh} kWh`} />
                  <InfoRow label="Monthly Consumption" value={`${energy?.monthly_consumption_kwh} kWh`} />
                  <InfoRow label="Daily Production"  value={`${energy?.daily_production_kwh} kWh`} color="text-green-400" />
                  <InfoRow label="Monthly Production" value={`${energy?.monthly_production_kwh} kWh`} color="text-green-400" />
                  <InfoRow label="Annual Production" value={`${energy?.annual_production_kwh?.toLocaleString()} kWh`} color="text-green-400" />
                  <div className="mt-2 flex items-center gap-2 bg-white/5 rounded p-2">
                    <Leaf size={14} className="text-green-400" />
                    <div>
                      <p className="text-xs text-gray-400">Annual CO₂ Offset</p>
                      <p className="text-sm font-bold text-green-400">
                        {fin?.annual_co2_offset_kg?.toLocaleString()} kg CO₂
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inverter */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-blue-400" /> Inverter & Grid
                  </h3>
                  <InfoRow label="Required"      value={`${inv?.required_kw} kW`} />
                  <InfoRow label="Selected"      value={`${inv?.selected_kw} kW`} color="text-blue-400" />
                  <InfoRow label="Type"          value={inv?.type} />
                  <InfoRow label="MPPT Inputs"   value={`${inv?.mppt_inputs} strings`} />
                </div>

                {/* Battery / Financial */}
                <div className="card">
                  {bat ? (
                    <>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Battery size={14} className="text-orange-400" /> Battery System
                      </h3>
                      <InfoRow label="Backup Hours"   value={`${bat?.backup_hours} hrs`} />
                      <InfoRow label="Battery Type"   value={bat?.battery_type} />
                      <InfoRow label="Depth of Discharge" value={`${(bat?.dod * 100).toFixed(0)}%`} />
                      <InfoRow label="Required Capacity" value={`${bat?.required_kwh} kWh`} />
                      <InfoRow label="Selected Capacity" value={`${bat?.selected_kwh} kWh`} color="text-orange-400" />
                      <InfoRow label="Number of Units"   value={bat?.num_units} />
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <TrendingUp size={14} className="text-accent" /> Financial Estimate
                      </h3>
                      <InfoRow label="Panel Cost"       value={`₱${fin?.panel_cost?.toLocaleString()}`} />
                      <InfoRow label="Inverter Cost"    value={`₱${fin?.inverter_cost?.toLocaleString()}`} />
                      <InfoRow label="Balance of System" value={`₱${fin?.bos_cost?.toLocaleString()}`} />
                      <InfoRow label="Installation"     value={`₱${fin?.installation_cost?.toLocaleString()}`} />
                      <InfoRow label="Total Cost"       value={`₱${fin?.total_cost?.toLocaleString()}`} color="text-accent" />
                      <InfoRow label="Annual Savings"   value={`₱${fin?.annual_savings_php?.toLocaleString()}`} color="text-green-400" />
                      <InfoRow label="Payback Period"   value={`${fin?.payback_years} years`} color="text-yellow-400" />
                    </>
                  )}
                </div>
              </div>

              {/* Financial summary if battery shown above */}
              {bat && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Financial Estimate</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                    {[
                      { label: 'Panels',       val: `₱${(fin?.panel_cost/1000).toFixed(0)}k`       },
                      { label: 'Inverter',     val: `₱${(fin?.inverter_cost/1000).toFixed(0)}k`    },
                      { label: 'Battery',      val: `₱${(fin?.battery_cost/1000).toFixed(0)}k`     },
                      { label: 'BOS',          val: `₱${(fin?.bos_cost/1000).toFixed(0)}k`        },
                      { label: 'Install',      val: `₱${(fin?.installation_cost/1000).toFixed(0)}k` },
                      { label: 'TOTAL',        val: `₱${(fin?.total_cost/1000).toFixed(0)}k`, accent: true },
                    ].map(({ label, val, accent }) => (
                      <div key={label} className="bg-white/5 rounded p-2">
                        <p className={`text-sm font-bold ${accent ? 'text-accent' : 'text-white'}`}>{val}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs">
                    <span className="text-gray-400">Annual Savings: <span className="text-green-400 font-bold">₱{fin?.annual_savings_php?.toLocaleString()}</span></span>
                    <span className="text-gray-400">Payback: <span className="text-yellow-400 font-bold">{fin?.payback_years} years</span></span>
                    <span className="text-gray-400">CO₂ offset: <span className="text-green-400 font-bold">{fin?.annual_co2_offset_kg?.toLocaleString()} kg/yr</span></span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-20">
              <Sun size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Enter consumption and click Calculate</p>
              <p className="text-sm text-gray-600 mt-1">Designed for Philippine solar conditions</p>
            </div>
          )}
        </div>
      </div>

      {/* Bill of Materials */}
      {result?.material_quantities && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300">Solar Installation — Bill of Materials</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-head">
                  <th className="text-left px-3 py-2">Material</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Size / Spec</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.material_quantities.map((m, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-3 py-2 font-medium text-white">{m.material}</td>
                    <td className="px-3 py-2 text-gray-400">{m.category}</td>
                    <td className="px-3 py-2 text-center text-gray-300">{m.size || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-accent">{m.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{m.unit}</td>
                    <td className="px-3 py-2 text-gray-500">{m.notes}</td>
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
