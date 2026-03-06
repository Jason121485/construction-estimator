import { useEffect, useState } from 'react'
import { getProjects, solarLoadAnalysis, runSolarAnalysis, saveSolar, getSolarConstants } from '../utils/api'
import { Sun, Save, CheckCircle, Zap, Battery, TrendingUp, Leaf, Plus, Trash2, ChevronRight, Shield, Cpu } from 'lucide-react'

// ── Default appliances ──────────────────────────────────────────────────────
const DEFAULT_APPLIANCES = [
  { name: 'LED Light',       qty: 10,  watts: 10,   hours_per_day: 5,  is_motor_load: false },
  { name: 'Ceiling Fan',     qty: 2,   watts: 60,   hours_per_day: 8,  is_motor_load: true  },
  { name: 'Television (LED)',qty: 1,   watts: 100,  hours_per_day: 6,  is_motor_load: false },
  { name: 'Refrigerator',    qty: 1,   watts: 150,  hours_per_day: 24, is_motor_load: true  },
  { name: 'Air Conditioner', qty: 1,   watts: 1500, hours_per_day: 8,  is_motor_load: true  },
  { name: 'Washing Machine', qty: 1,   watts: 500,  hours_per_day: 1,  is_motor_load: true  },
]

const DEFAULT_INPUTS = {
  monthly_kwh: 500,
  location: 'General (Luzon)',
  panel_wattage_wp: 400,
  battery_type: 'Lithium (LFP)',
  backup_hours: 4,
  system_type: 'grid_tied',
  roof_area_m2: '',
}

const fmt = (n) => Math.round(n || 0).toLocaleString()
const fmtK = (n) => `₱${((n || 0) / 1000).toFixed(0)}k`

function InfoRow({ label, value, color = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium ${color}`}>{value}</span>
    </div>
  )
}

// ── Tab 1: Load Analysis ─────────────────────────────────────────────────────
function LoadAnalysisTab({ appliances, setAppliances, loadResult, onCompute, onUseInDesign }) {
  const updateRow = (i, key, val) =>
    setAppliances(a => a.map((r, idx) => idx === i ? { ...r, [key]: val } : r))

  const addRow = () =>
    setAppliances(a => [...a, { name: '', qty: 1, watts: 0, hours_per_day: 1, is_motor_load: false }])

  const removeRow = (i) =>
    setAppliances(a => a.filter((_, idx) => idx !== i))

  const rowWh = (r) => (r.qty || 0) * (r.watts || 0) * (r.hours_per_day || 0)

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Appliance Load Schedule</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={addRow}>
            <Plus size={12} /> Add Appliance
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                <th className="text-left px-3 py-2">Appliance</th>
                <th className="px-2 py-2 text-center">Qty</th>
                <th className="px-2 py-2 text-center">Watts (W)</th>
                <th className="px-2 py-2 text-center">Hrs/Day</th>
                <th className="px-2 py-2 text-center">Daily (Wh)</th>
                <th className="px-2 py-2 text-center">Motor?</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {appliances.map((row, i) => (
                <tr key={i} className="table-row group">
                  <td className="px-2 py-1.5">
                    <input className="input py-1 text-xs" value={row.name}
                      onChange={e => updateRow(i, 'name', e.target.value)}
                      placeholder="e.g. LED Light" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="input py-1 text-xs text-center w-14" type="number" min="0"
                      value={row.qty} onChange={e => updateRow(i, 'qty', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="input py-1 text-xs text-center w-20" type="number" min="0"
                      value={row.watts} onChange={e => updateRow(i, 'watts', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="input py-1 text-xs text-center w-16" type="number" min="0" max="24" step="0.5"
                      value={row.hours_per_day} onChange={e => updateRow(i, 'hours_per_day', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold text-accent">
                    {fmt(rowWh(row))}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={row.is_motor_load}
                      onChange={e => updateRow(i, 'is_motor_load', e.target.checked)}
                      className="accent-emerald-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals footer */}
        <div className="border-t border-white/10 px-4 py-3 flex flex-wrap gap-6 bg-white/5">
          <div>
            <p className="text-xs text-gray-500">Total Load</p>
            <p className="text-lg font-bold text-white">
              {fmt(appliances.reduce((s, r) => s + (r.qty || 0) * (r.watts || 0), 0))} W
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Daily Consumption</p>
            <p className="text-lg font-bold text-accent">
              {fmt(appliances.reduce((s, r) => s + rowWh(r), 0))} Wh
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Surge Load (motor×3, other×1.3)</p>
            <p className="text-lg font-bold text-yellow-400">
              {fmt(appliances.reduce((s, r) => {
                const rw = (r.qty || 0) * (r.watts || 0)
                return s + rw * (r.is_motor_load ? 3.0 : 1.3)
              }, 0))} W
            </p>
          </div>
        </div>
      </div>

      {loadResult && (
        <div className="card bg-emerald-900/10 border-emerald-500/20">
          <p className="text-xs font-semibold text-emerald-400 mb-1">Load Analysis Complete</p>
          <p className="text-xs text-gray-400">
            Daily load: <span className="text-white font-bold">{fmt(loadResult.daily_wh)} Wh</span>
            {' '}· Surge: <span className="text-yellow-400 font-bold">{fmt(loadResult.surge_watts)} W</span>
            {' '}· Equivalent: <span className="text-white font-bold">{(loadResult.daily_wh / 1000 * 30).toFixed(0)} kWh/month</span>
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-accent flex items-center gap-2" onClick={onCompute}>
          <Zap size={16} /> Compute Load
        </button>
        {loadResult && (
          <button className="btn-primary flex items-center gap-2" onClick={onUseInDesign}>
            Use in System Design <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: System Design ─────────────────────────────────────────────────────
function SystemDesignTab({ inputs, setInputs, constants, loadResult, result, loading, onCalculate }) {
  const set = (k, v) => setInputs(i => ({ ...i, [k]: v }))
  const locations = constants?.locations || ['General (Luzon)']
  const panels    = constants?.panel_wattages || [400]
  const batTypes  = constants?.battery_types || ['Lithium (LFP)']
  const sysTypes  = constants?.system_types || {}

  const energy = result?.energy
  const pv     = result?.pv_array
  const inv    = result?.inverter
  const bat    = result?.battery
  const fin    = result?.financials
  const ctrl   = result?.charge_controller
  const prot   = result?.protection

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Inputs */}
      <div className="space-y-3">
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">System Design Inputs</h3>

          {loadResult ? (
            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded p-3">
              <p className="text-xs text-emerald-400 font-semibold">From Load Analysis</p>
              <p className="text-sm font-bold text-white">{fmt(loadResult.daily_wh)} Wh/day</p>
              <p className="text-xs text-gray-500">{(loadResult.daily_wh / 1000 * 30).toFixed(0)} kWh/month</p>
            </div>
          ) : (
            <div>
              <label className="label">Monthly Consumption (kWh)</label>
              <input className="input" type="number" min="0" step="10" value={inputs.monthly_kwh}
                onChange={e => set('monthly_kwh', e.target.value)} />
              <p className="text-xs text-gray-600 mt-0.5">Check your MERALCO bill or use Load Analysis tab</p>
            </div>
          )}

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

          <button className="btn-accent w-full flex items-center justify-center gap-2 mt-1"
            onClick={onCalculate} disabled={loading}>
            <Sun size={16} />
            {loading ? 'Calculating…' : 'Calculate Solar System'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-2 space-y-4">
        {result ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card text-center">
                <Sun size={18} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-400">{pv?.actual_kw} kWp</p>
                <p className="text-xs text-gray-400">System Size</p>
              </div>
              <div className="card text-center">
                <Zap size={18} className="text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-400">{pv?.num_panels}</p>
                <p className="text-xs text-gray-400">Panels ({pv?.panel_wattage_wp}Wp)</p>
              </div>
              <div className="card text-center">
                <Battery size={18} className="text-green-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-400">{inv?.selected_kw} kW</p>
                <p className="text-xs text-gray-400">Inverter</p>
              </div>
              <div className="card text-center">
                <TrendingUp size={18} className="text-accent mx-auto mb-1" />
                <p className="text-xl font-bold text-accent">
                  {energy?.monthly_production_kwh?.toLocaleString()} kWh
                </p>
                <p className="text-xs text-gray-400">Monthly Production</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PV Array */}
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Sun size={12} className="text-yellow-400" /> PV Array Design
                </h3>
                <InfoRow label="Required Capacity"  value={`${pv?.required_kw} kWp`} />
                <InfoRow label="Actual Capacity"    value={`${pv?.actual_kw} kWp`}   color="text-yellow-400" />
                <InfoRow label="Number of Panels"   value={pv?.num_panels}            color="text-yellow-400" />
                <InfoRow label="Panel Wattage"      value={`${pv?.panel_wattage_wp} Wp`} />
                <InfoRow label="Strings × Panels"   value={`${pv?.num_strings} × ${pv?.panels_per_string}`} />
                <InfoRow label="Roof Area Required" value={`${pv?.required_roof_m2} m²`}
                  color={pv?.roof_area_ok ? 'text-green-400' : 'text-red-400'} />
                <InfoRow label="Peak Sun Hours"     value={`${result.peak_sun_hours} hrs/day`} />
                <InfoRow label="Performance Ratio"  value={`${(result.performance_ratio * 100).toFixed(0)}%`} />
              </div>

              {/* Inverter */}
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Zap size={12} className="text-blue-400" /> Inverter
                </h3>
                <InfoRow label="Required"    value={`${inv?.required_kw} kW`} />
                <InfoRow label="Selected"    value={`${inv?.selected_kw} kW`} color="text-blue-400" />
                <InfoRow label="Type"        value={inv?.type} />
                <InfoRow label="MPPT Inputs" value={`${inv?.mppt_inputs} strings`} />
              </div>

              {/* Charge Controller */}
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Cpu size={12} className="text-purple-400" /> Charge Controller (MPPT)
                </h3>
                <InfoRow label="Raw Current"     value={`${ctrl?.raw_amps} A`} />
                <InfoRow label="Selected Size"   value={`${ctrl?.selected_amps} A`}  color="text-purple-400" />
                <InfoRow label="Type"            value={ctrl?.type} />
                <InfoRow label="System Voltage"  value={`${ctrl?.voltage} V DC`} />
                <InfoRow label="Recommended"     value={ctrl?.model_hint} color="text-purple-400" />
              </div>

              {/* Electrical Protection */}
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Shield size={12} className="text-red-400" /> Electrical Protection
                </h3>
                <InfoRow label="DC String Breaker" value={`${prot?.dc_string_breaker_a}A × ${prot?.string_breakers_qty} pcs`} color="text-red-400" />
                <InfoRow label="AC Main Breaker"   value={`${prot?.ac_breaker_a}A (2-pole)`}  color="text-red-400" />
                <InfoRow label="DC Disconnect"     value={`${prot?.disconnect_dc} unit`} />
                <InfoRow label="AC Disconnect"     value={`${prot?.disconnect_ac} unit`} />
                <InfoRow label="DC SPD"            value={`${prot?.spd_dc} unit`} />
                <InfoRow label="AC SPD"            value={`${prot?.spd_ac} unit`} />
              </div>

              {/* Energy */}
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <TrendingUp size={12} className="text-accent" /> Energy Analysis
                </h3>
                <InfoRow label="Daily Consumption"   value={`${energy?.daily_consumption_kwh} kWh`} />
                <InfoRow label="Monthly Consumption" value={`${energy?.monthly_consumption_kwh} kWh`} />
                <InfoRow label="Daily Production"    value={`${energy?.daily_production_kwh} kWh`}   color="text-green-400" />
                <InfoRow label="Monthly Production"  value={`${energy?.monthly_production_kwh} kWh`} color="text-green-400" />
                <InfoRow label="Annual Production"   value={`${energy?.annual_production_kwh?.toLocaleString()} kWh`} color="text-green-400" />
                <div className="mt-2 flex items-center gap-2 bg-white/5 rounded p-2">
                  <Leaf size={12} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Annual CO₂ Offset</p>
                    <p className="text-sm font-bold text-green-400">{fin?.annual_co2_offset_kg?.toLocaleString()} kg</p>
                  </div>
                </div>
              </div>

              {/* Battery or Financial */}
              <div className="card">
                {bat ? (
                  <>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Battery size={12} className="text-orange-400" /> Battery System
                    </h3>
                    <InfoRow label="Backup Hours"       value={`${bat?.backup_hours} hrs`} />
                    <InfoRow label="Battery Type"       value={bat?.battery_type} />
                    <InfoRow label="Depth of Discharge" value={`${(bat?.dod * 100).toFixed(0)}%`} />
                    <InfoRow label="Required Capacity"  value={`${bat?.required_kwh} kWh`} />
                    <InfoRow label="Selected Capacity"  value={`${bat?.selected_kwh} kWh`} color="text-orange-400" />
                    <InfoRow label="Number of Units"    value={bat?.num_units} />
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <TrendingUp size={12} className="text-accent" /> Financial Estimate
                    </h3>
                    <InfoRow label="Panel Cost"        value={`₱${fin?.panel_cost?.toLocaleString()}`} />
                    <InfoRow label="Inverter Cost"     value={`₱${fin?.inverter_cost?.toLocaleString()}`} />
                    <InfoRow label="Balance of System" value={`₱${fin?.bos_cost?.toLocaleString()}`} />
                    <InfoRow label="Installation"      value={`₱${fin?.installation_cost?.toLocaleString()}`} />
                    <InfoRow label="Total Cost"        value={`₱${fin?.total_cost?.toLocaleString()}`}        color="text-accent" />
                    <InfoRow label="Annual Savings"    value={`₱${fin?.annual_savings_php?.toLocaleString()}`} color="text-green-400" />
                    <InfoRow label="Payback Period"    value={`${fin?.payback_years} years`}                   color="text-yellow-400" />
                  </>
                )}
              </div>
            </div>

            {bat && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Financial Estimate</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  {[
                    { label: 'Panels',   val: fmtK(fin?.panel_cost) },
                    { label: 'Inverter', val: fmtK(fin?.inverter_cost) },
                    { label: 'Battery',  val: fmtK(fin?.battery_cost) },
                    { label: 'BOS',      val: fmtK(fin?.bos_cost) },
                    { label: 'Install',  val: fmtK(fin?.installation_cost) },
                    { label: 'TOTAL',    val: fmtK(fin?.total_cost), accent: true },
                  ].map(({ label, val, accent }) => (
                    <div key={label} className="bg-white/5 rounded p-2">
                      <p className={`text-sm font-bold ${accent ? 'text-accent' : 'text-white'}`}>{val}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="text-gray-400">Annual Savings: <span className="text-green-400 font-bold">₱{fin?.annual_savings_php?.toLocaleString()}</span></span>
                  <span className="text-gray-400">Payback: <span className="text-yellow-400 font-bold">{fin?.payback_years} yrs</span></span>
                  <span className="text-gray-400">CO₂: <span className="text-green-400 font-bold">{fin?.annual_co2_offset_kg?.toLocaleString()} kg/yr</span></span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-20">
            <Sun size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Enter consumption and click Calculate Solar System</p>
            <p className="text-sm text-gray-600 mt-1">Or run Load Analysis first for appliance-based sizing</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 3: BOM & Cost ────────────────────────────────────────────────────────
function BomTab({ result, projects, selProject, setSelProject, saving, saved, onSave }) {
  const fin = result?.financials

  const [bomRows, setBomRows] = useState([])

  useEffect(() => {
    if (result?.material_quantities) {
      setBomRows(result.material_quantities.map(m => ({
        ...m,
        unit_price: 0,
        total: 0,
        _edited: false,
      })))
    }
  }, [result])

  const updateRow = (i, key, val) =>
    setBomRows(r => r.map((row, idx) => {
      if (idx !== i) return row
      const updated = { ...row, [key]: val, _edited: true }
      updated.total = (updated.quantity || 0) * (updated.unit_price || 0)
      return updated
    }))

  const removeRow = (i) => setBomRows(r => r.filter((_, idx) => idx !== i))

  const addRow = () =>
    setBomRows(r => [...r, {
      material: '', category: 'Solar', size: '', unit: 'unit',
      quantity: 1, unit_price: 0, total: 0, notes: '', _edited: true,
    }])

  const grandTotal = bomRows.reduce((s, r) => s + (r.total || 0), 0)
  const installation = grandTotal * 0.10
  const overhead     = grandTotal * 0.10
  const projectTotal = grandTotal + installation + overhead

  if (!result) {
    return (
      <div className="card text-center py-20">
        <Sun size={40} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Run System Design first to generate the BOM</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Editable BOM table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Bill of Materials — Editable</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={addRow}>
            <Plus size={12} /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                <th className="text-left px-3 py-2">Material</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Spec</th>
                <th className="px-2 py-2 text-center">Qty</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2 text-right">Unit Price (₱)</th>
                <th className="px-2 py-2 text-right">Total (₱)</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row, i) => (
                <tr key={i} className="table-row group">
                  <td className="px-2 py-1.5">
                    <input className="input py-1 text-xs" value={row.material || ''}
                      onChange={e => updateRow(i, 'material', e.target.value)} />
                  </td>
                  <td className="px-2 py-1.5 text-gray-400">{row.category}</td>
                  <td className="px-2 py-1.5 text-gray-500">{row.size || '—'}</td>
                  <td className="px-1 py-1.5">
                    <input className="input py-1 text-xs text-center w-16" type="number" min="0"
                      value={row.quantity}
                      onChange={e => updateRow(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1.5 text-gray-400">{row.unit}</td>
                  <td className="px-1 py-1.5">
                    <input className="input py-1 text-xs text-right w-24" type="number" min="0" step="100"
                      value={row.unit_price}
                      onChange={e => updateRow(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-accent">
                    {row.total > 0 ? `₱${fmt(row.total)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 bg-white/5">
                <td colSpan={6} className="px-3 py-2 text-right text-sm font-bold text-gray-300">Equipment Total</td>
                <td className="px-2 py-2 text-right text-sm font-bold text-accent">₱{fmt(grandTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Cost Summary</h3>
          <InfoRow label="Equipment (BOM)"      value={`₱${fmt(grandTotal)}`} />
          <InfoRow label="Installation (10%)"   value={`₱${fmt(installation)}`} />
          <InfoRow label="Overhead (10%)"        value={`₱${fmt(overhead)}`} />
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-sm font-bold text-white">Project Total</span>
            <span className="text-lg font-bold text-accent">₱{fmt(projectTotal)}</span>
          </div>
        </div>

        {fin && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Financial Analysis</h3>
            <InfoRow label="Annual Energy Savings" value={`₱${fin?.annual_savings_php?.toLocaleString()}`}  color="text-green-400" />
            <InfoRow label="Simple Payback Period"  value={`${fin?.payback_years} years`}                   color="text-yellow-400" />
            <InfoRow label="Annual CO₂ Offset"      value={`${fin?.annual_co2_offset_kg?.toLocaleString()} kg`} color="text-green-400" />
            <InfoRow label="25-Year CO₂ Offset"     value={`${fmt((fin?.annual_co2_offset_kg || 0) * 25)} kg`} color="text-green-400" />
          </div>
        )}
      </div>

      {/* Save to project */}
      <div className="card flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="label">Save to Project</label>
          <select className="input" value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        <button className="btn-accent flex items-center gap-2"
          onClick={onSave} disabled={!selProject || saving}>
          {saved ? <CheckCircle size={16} className="text-green-400" /> : <Save size={16} />}
          {saved ? 'Saved to Project!' : saving ? 'Saving…' : 'Save & Generate Estimates'}
        </button>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SolarCalculator() {
  const [tab, setTab]               = useState(0)
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [inputs, setInputs]         = useState(DEFAULT_INPUTS)
  const [appliances, setAppliances] = useState(DEFAULT_APPLIANCES)
  const [constants, setConstants]   = useState(null)
  const [loadResult, setLoadResult] = useState(null)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    getProjects().then(r => setProjects(r.data))
    getSolarConstants().then(r => setConstants(r.data))
  }, [])

  const computeLoad = async () => {
    try {
      const r = await solarLoadAnalysis({ appliances })
      setLoadResult(r.data)
    } catch (e) { console.error(e) }
  }

  const useLoadInDesign = () => {
    setTab(1)
  }

  const runAnalysis = async () => {
    setLoading(true); setSaved(false)
    try {
      const payload = {
        ...inputs,
        monthly_kwh:      parseFloat(inputs.monthly_kwh) || 0,
        panel_wattage_wp: parseFloat(inputs.panel_wattage_wp) || 400,
        backup_hours:     parseFloat(inputs.backup_hours) || 4,
        roof_area_m2:     inputs.roof_area_m2 ? parseFloat(inputs.roof_area_m2) : null,
        appliances:       loadResult ? appliances : null,
        daily_load_wh:    loadResult ? loadResult.daily_wh : null,
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
        project_id:       parseInt(selProject),
        ...inputs,
        monthly_kwh:      parseFloat(inputs.monthly_kwh) || 0,
        panel_wattage_wp: parseFloat(inputs.panel_wattage_wp) || 400,
        backup_hours:     parseFloat(inputs.backup_hours) || 4,
        roof_area_m2:     inputs.roof_area_m2 ? parseFloat(inputs.roof_area_m2) : null,
        appliances:       loadResult ? appliances : null,
        daily_load_wh:    loadResult ? loadResult.daily_wh : null,
      })
      setSaved(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const TABS = ['Load Analysis', 'System Design', 'BOM & Cost']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sun className="text-yellow-400" size={22} /> Solar PV Calculator
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Load analysis · System design · Charge controller · Protection · BOM · Financial analysis
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {TABS.map((t, i) => (
          <button key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === i
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-gray-400 hover:text-white'
            }`}>
            {t}
            {i === 0 && loadResult && <span className="ml-1.5 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">✓</span>}
            {i === 1 && result && <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">✓</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 0 && (
        <LoadAnalysisTab
          appliances={appliances}
          setAppliances={setAppliances}
          loadResult={loadResult}
          onCompute={computeLoad}
          onUseInDesign={useLoadInDesign}
        />
      )}
      {tab === 1 && (
        <SystemDesignTab
          inputs={inputs}
          setInputs={setInputs}
          constants={constants}
          loadResult={loadResult}
          result={result}
          loading={loading}
          onCalculate={runAnalysis}
        />
      )}
      {tab === 2 && (
        <BomTab
          result={result}
          projects={projects}
          selProject={selProject}
          setSelProject={setSelProject}
          saving={saving}
          saved={saved}
          onSave={saveToProject}
        />
      )}
    </div>
  )
}
