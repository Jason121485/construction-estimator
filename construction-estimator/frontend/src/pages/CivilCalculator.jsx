import { useState, useEffect } from 'react'
import { getProjects, analyzeCivil, saveCivil } from '../utils/api'
import { Construction, Save, ChevronRight } from 'lucide-react'

const fmt = (n) => typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'

// ── Input Panels ──────────────────────────────────────────────────────────────

function CutFillForm({ onAnalyze }) {
  const [f, setF] = useState({
    area_m2: 500, cut_depth_m: 1.5, fill_depth_m: 0.5,
    swell_factor: 1.25, compaction_factor: 0.85,
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Site Area (m²)</label>
          <input className="input" type="number" min="0" step="50" value={f.area_m2} onChange={e => s('area_m2', +e.target.value)} /></div>
        <div><label className="label">Average Cut Depth (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.cut_depth_m} onChange={e => s('cut_depth_m', +e.target.value)} /></div>
        <div><label className="label">Average Fill Depth (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.fill_depth_m} onChange={e => s('fill_depth_m', +e.target.value)} /></div>
        <div><label className="label">Swell Factor</label>
          <input className="input" type="number" min="1" max="2" step="0.05" value={f.swell_factor} onChange={e => s('swell_factor', +e.target.value)} /></div>
        <div><label className="label">Compaction Factor</label>
          <input className="input" type="number" min="0.5" max="1" step="0.05" value={f.compaction_factor} onChange={e => s('compaction_factor', +e.target.value)} /></div>
      </div>
      <button className="btn-primary w-full" onClick={() => onAnalyze('cut_fill', f)}>Calculate Cut &amp; Fill</button>
    </div>
  )
}

function TrenchForm({ onAnalyze }) {
  const [f, setF] = useState({ length_m: 100, width_m: 0.8, depth_m: 1.5, pipe_diameter_mm: 200, bedding_thickness_m: 0.15 })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Trench Length (m)</label>
          <input className="input" type="number" min="0" step="10" value={f.length_m} onChange={e => s('length_m', +e.target.value)} /></div>
        <div><label className="label">Trench Width (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.width_m} onChange={e => s('width_m', +e.target.value)} /></div>
        <div><label className="label">Trench Depth (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.depth_m} onChange={e => s('depth_m', +e.target.value)} /></div>
        <div><label className="label">Pipe Diameter (mm)</label>
          <input className="input" type="number" min="0" step="50" value={f.pipe_diameter_mm} onChange={e => s('pipe_diameter_mm', +e.target.value)} /></div>
        <div><label className="label">Bedding Thickness (m)</label>
          <input className="input" type="number" min="0" step="0.05" value={f.bedding_thickness_m} onChange={e => s('bedding_thickness_m', +e.target.value)} /></div>
      </div>
      <button className="btn-primary w-full" onClick={() => onAnalyze('trench', f)}>Calculate Trench</button>
    </div>
  )
}

function RoadForm({ onAnalyze }) {
  const [f, setF] = useState({
    length_m: 500, carriageway_width_m: 7, base_thickness_m: 0.2,
    subbase_thickness_m: 0.3, pavement_thickness_m: 0.15, shoulder_width_m: 1.0,
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Road Length (m)</label>
          <input className="input" type="number" min="0" step="50" value={f.length_m} onChange={e => s('length_m', +e.target.value)} /></div>
        <div><label className="label">Carriageway Width (m)</label>
          <input className="input" type="number" min="3" step="0.5" value={f.carriageway_width_m} onChange={e => s('carriageway_width_m', +e.target.value)} /></div>
        <div><label className="label">Subbase Thickness (m)</label>
          <input className="input" type="number" min="0" step="0.05" value={f.subbase_thickness_m} onChange={e => s('subbase_thickness_m', +e.target.value)} /></div>
        <div><label className="label">Base Course Thickness (m)</label>
          <input className="input" type="number" min="0" step="0.05" value={f.base_thickness_m} onChange={e => s('base_thickness_m', +e.target.value)} /></div>
        <div><label className="label">Pavement Thickness (m)</label>
          <input className="input" type="number" min="0" step="0.05" value={f.pavement_thickness_m} onChange={e => s('pavement_thickness_m', +e.target.value)} /></div>
        <div><label className="label">Shoulder Width (m)</label>
          <input className="input" type="number" min="0" step="0.5" value={f.shoulder_width_m} onChange={e => s('shoulder_width_m', +e.target.value)} /></div>
      </div>
      <button className="btn-primary w-full" onClick={() => onAnalyze('road', f)}>Calculate Road</button>
    </div>
  )
}

function DrainageForm({ onAnalyze }) {
  const [f, setF] = useState({
    length_m: 200, pipe_diameter_mm: 450, trench_width_m: 1.0,
    manhole_spacing_m: 50, cover_depth_m: 1.2, pipe_material: 'RCCP',
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Length (m)</label>
          <input className="input" type="number" min="0" step="10" value={f.length_m} onChange={e => s('length_m', +e.target.value)} /></div>
        <div><label className="label">Pipe Diameter (mm)</label>
          <input className="input" type="number" min="100" step="50" value={f.pipe_diameter_mm} onChange={e => s('pipe_diameter_mm', +e.target.value)} /></div>
        <div><label className="label">Trench Width (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.trench_width_m} onChange={e => s('trench_width_m', +e.target.value)} /></div>
        <div><label className="label">Manhole Spacing (m)</label>
          <input className="input" type="number" min="10" step="5" value={f.manhole_spacing_m} onChange={e => s('manhole_spacing_m', +e.target.value)} /></div>
        <div><label className="label">Cover Depth (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.cover_depth_m} onChange={e => s('cover_depth_m', +e.target.value)} /></div>
        <div><label className="label">Pipe Material</label>
          <select className="input" value={f.pipe_material} onChange={e => s('pipe_material', e.target.value)}>
            <option>RCCP</option><option>HDPE</option><option>PVC</option>
          </select>
        </div>
      </div>
      <button className="btn-primary w-full" onClick={() => onAnalyze('drainage', f)}>Calculate Drainage</button>
    </div>
  )
}

function PipelineForm({ onAnalyze }) {
  const [f, setF] = useState({
    length_m: 300, pipe_diameter_mm: 200, pipe_material: 'ductile_iron',
    trench_width_m: 1.0, depth_m: 1.5, thrust_block_spacing_m: 100,
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Length (m)</label>
          <input className="input" type="number" min="0" step="10" value={f.length_m} onChange={e => s('length_m', +e.target.value)} /></div>
        <div><label className="label">Pipe Diameter (mm)</label>
          <input className="input" type="number" min="50" step="25" value={f.pipe_diameter_mm} onChange={e => s('pipe_diameter_mm', +e.target.value)} /></div>
        <div><label className="label">Pipe Material</label>
          <select className="input" value={f.pipe_material} onChange={e => s('pipe_material', e.target.value)}>
            <option value="ductile_iron">Ductile Iron</option>
            <option value="pvc">PVC</option>
            <option value="hdpe">HDPE</option>
            <option value="steel">Steel</option>
          </select>
        </div>
        <div><label className="label">Trench Width (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.trench_width_m} onChange={e => s('trench_width_m', +e.target.value)} /></div>
        <div><label className="label">Burial Depth (m)</label>
          <input className="input" type="number" min="0" step="0.1" value={f.depth_m} onChange={e => s('depth_m', +e.target.value)} /></div>
        <div><label className="label">Thrust Block Spacing (m)</label>
          <input className="input" type="number" min="10" step="10" value={f.thrust_block_spacing_m} onChange={e => s('thrust_block_spacing_m', +e.target.value)} /></div>
      </div>
      <button className="btn-primary w-full" onClick={() => onAnalyze('pipeline', f)}>Calculate Pipeline</button>
    </div>
  )
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, projects, onSave, saving }) {
  const [selProject, setSelProject] = useState('')
  if (!result) return null

  const r = result.results || {}
  const items = result.material_quantities || []

  return (
    <div className="space-y-4">
      <div className="card bg-navy/40">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Results</p>
        <p className="text-sm text-accent font-medium mb-3">{result.summary}</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(r).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs border-b border-white/5 pb-1">
              <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="text-white font-medium">{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs text-gray-300 font-semibold">Material Quantities (BOQ)</p>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="table-head">
            <th className="text-left px-4 py-2">Item</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2 text-right">Qty</th>
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="table-row">
                <td className="px-4 py-2 text-white">{item.name}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{item.unit}</td>
                <td className="px-3 py-2 text-right text-accent font-semibold">{fmt(item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-3">
        <p className="text-xs text-gray-300 font-semibold">Save to Project</p>
        <select className="input" value={selProject} onChange={e => setSelProject(e.target.value)}>
          <option value="">Choose a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
        <button
          className="btn-accent w-full flex items-center justify-center gap-2"
          disabled={!selProject || saving}
          onClick={() => selProject && onSave(selProject)}
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save & Generate Estimates'}
        </button>
        <p className="text-xs text-gray-600">
          This will replace any existing Civil estimates for the selected project.
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cut_fill', label: 'Cut & Fill',  Form: CutFillForm },
  { id: 'trench',   label: 'Trench',      Form: TrenchForm },
  { id: 'road',     label: 'Road',        Form: RoadForm },
  { id: 'drainage', label: 'Drainage',    Form: DrainageForm },
  { id: 'pipeline', label: 'Pipeline',    Form: PipelineForm },
]

export default function CivilCalculator() {
  const [activeTab, setActiveTab]   = useState('cut_fill')
  const [result, setResult]         = useState(null)
  const [projects, setProjects]     = useState([])
  const [saving, setSaving]         = useState(false)
  const [lastInputs, setLastInputs] = useState({})

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  // Reset result when tab changes
  const handleTab = (id) => { setActiveTab(id); setResult(null) }

  const handleAnalyze = async (calcType, inputs) => {
    setLastInputs({ calcType, inputs })
    const res = await analyzeCivil({ calc_type: calcType, inputs })
    setResult(res.data)
  }

  const handleSave = async (pid) => {
    setSaving(true)
    await saveCivil(pid, { calc_type: lastInputs.calcType, inputs: lastInputs.inputs })
    setSaving(false)
    alert('Civil estimates saved to project!')
  }

  const ActiveForm = TABS.find(t => t.id === activeTab)?.Form

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Civil Engineering Calculator</h1>
        <p className="text-sm text-gray-400 mt-1">
          Earthworks, roads, drainage, and pipeline quantity takeoff
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface rounded border border-white/10 p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => handleTab(t.id)}
            className={`flex-1 min-w-20 px-3 py-2 text-xs font-medium rounded transition-colors
              ${activeTab === t.id ? 'bg-navy text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Construction size={16} className="text-accent" />
            {TABS.find(t => t.id === activeTab)?.label} Inputs
          </h3>
          {ActiveForm && <ActiveForm onAnalyze={handleAnalyze} />}
        </div>

        {/* Results */}
        <div>
          {result ? (
            <ResultsPanel
              result={result}
              projects={projects}
              onSave={handleSave}
              saving={saving}
            />
          ) : (
            <div className="card text-center py-16">
              <ChevronRight size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Enter inputs and click Calculate to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
